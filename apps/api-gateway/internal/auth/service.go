// Package auth implements GitHub OAuth2 authentication and JWT session management
// for the Sentra SaaS platform (Phase 11).
//
// Flow:
//  1. GET /api/v1/auth/github/login  → redirects to GitHub OAuth page
//  2. GET /api/v1/auth/github/callback → exchanges code, upserts user, returns JWT
//
// Security design:
//   - HMAC-SHA256 state parameter prevents CSRF on the callback
//   - JWT signed with HS256 using JWT_SECRET env var (minimum 32 bytes recommended)
//   - Access tokens stored in DB; only the JWT is sent to the frontend
package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"log"
)

// GitHubUser is the relevant subset of the GitHub /user API response.
type GitHubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

// SentraClaims are the JWT payload claims issued to authenticated users.
type SentraClaims struct {
	UserID      int64  `json:"user_id"`
	GitHubID    int64  `json:"github_id"`
	GitHubLogin string `json:"github_login"`
	jwt.RegisteredClaims
}

// Service handles all OAuth and user persistence logic.
// It is stateless beyond the DB pool and config values.
type Service struct {
	db           *pgxpool.Pool
	clientID     string
	clientSecret string
	jwtSecret    []byte
}

// NewService constructs the auth Service. Panics at startup if required
// environment variables are missing (fail-fast principle).
func NewService(db *pgxpool.Pool) *Service {
	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	jwtSecret := os.Getenv("JWT_SECRET")

	if clientID == "" {
		log.Fatal("GITHUB_CLIENT_ID is required for OAuth")
	}
	if clientSecret == "" {
		log.Fatal("GITHUB_CLIENT_SECRET is required for OAuth")
	}
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET is required for session signing")
	}

	return &Service{
		db:           db,
		clientID:     clientID,
		clientSecret: clientSecret,
		jwtSecret:    []byte(jwtSecret),
	}
}

// GetClientID exposes the OAuth client ID for the handler to build the auth URL.
func (s *Service) GetClientID() string {
	return s.clientID
}

// ExchangeCodeForToken exchanges a GitHub OAuth authorization code for an access token.
// Calls the GitHub token endpoint with client credentials.
func (s *Service) ExchangeCodeForToken(ctx context.Context, code string) (string, error) {
	url := fmt.Sprintf(
		"https://github.com/login/oauth/access_token?client_id=%s&client_secret=%s&code=%s",
		s.clientID, s.clientSecret, code,
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, nil)
	if err != nil {
		return "", fmt.Errorf("build token request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("github token exchange: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse token response: %w", err)
	}
	if result.Error != "" {
		return "", fmt.Errorf("github oauth error: %s — %s", result.Error, result.ErrorDesc)
	}
	if result.AccessToken == "" {
		return "", fmt.Errorf("github returned empty access token")
	}

	return result.AccessToken, nil
}

// FetchGitHubUser calls the GitHub /user endpoint to retrieve the authenticated user's profile.
func (s *Service) FetchGitHubUser(ctx context.Context, accessToken string) (*GitHubUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return nil, fmt.Errorf("build user request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("github user fetch: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github user API returned status %d", resp.StatusCode)
	}

	var user GitHubUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("decode user response: %w", err)
	}
	if user.Login == "" {
		return nil, fmt.Errorf("github user has empty login")
	}

	return &user, nil
}

// UpsertUser inserts or updates the user record in the database.
// Returns the internal Sentra user ID (BIGSERIAL) to embed in the JWT.
func (s *Service) UpsertUser(ctx context.Context, ghUser *GitHubUser, accessToken string) (int64, error) {
	var (
		userID    int64
		nullName  *string
		nullEmail *string
	)
	if ghUser.Name != "" {
		nullName = &ghUser.Name
	}
	if ghUser.Email != "" {
		nullEmail = &ghUser.Email
	}

	err := s.db.QueryRow(ctx, `
		INSERT INTO users (
			github_id, login, name, email, avatar_url,
			github_access_token, installation_id, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, NULL, NOW())
		ON CONFLICT (github_id) DO UPDATE
		SET
			login               = EXCLUDED.login,
			name                = EXCLUDED.name,
			email               = EXCLUDED.email,
			avatar_url          = EXCLUDED.avatar_url,
			github_access_token = EXCLUDED.github_access_token,
			updated_at          = NOW()
		RETURNING id`,
		ghUser.ID, ghUser.Login, nullName, nullEmail,
		ghUser.AvatarURL, accessToken,
	).Scan(&userID)
	if err != nil {
		return 0, fmt.Errorf("upsert user: %w", err)
	}

	return userID, nil
}

// GetUserInstallation checks whether the user has installed the GitHub App.
// Returns (installationID, installed, error).
// First checks DB; if DB has no installation_id, calls GitHub API to discover one.
func (s *Service) GetUserInstallation(ctx context.Context, userID int64, accessToken string) (int64, bool, error) {
	// 1. Check DB first (fast path)
	var dbInstallID *int64
	err := s.db.QueryRow(ctx, `SELECT installation_id FROM users WHERE id = $1`, userID).Scan(&dbInstallID)
	if err != nil {
		return 0, false, fmt.Errorf("query user installation: %w", err)
	}
	if dbInstallID != nil && *dbInstallID > 0 {
		return *dbInstallID, true, nil
	}

	// 2. Slow path: call GitHub API to check installations for this user
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user/installations", nil)
	if err != nil {
		return 0, false, fmt.Errorf("build installations request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, false, fmt.Errorf("github installations fetch: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		TotalCount    int `json:"total_count"`
		Installations []struct {
			ID    int64 `json:"id"`
			AppID int   `json:"app_id"`
		} `json:"installations"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, false, fmt.Errorf("decode installations: %w", err)
	}

	if len(result.Installations) == 0 {
		return 0, false, nil
	}

	// Take the first installation found and persist it to DB
	installID := result.Installations[0].ID
	_, err = s.db.Exec(ctx,
		`UPDATE users SET installation_id = $1, updated_at = NOW() WHERE id = $2`,
		installID, userID,
	)
	if err != nil {
		log.Printf("Failed to persist installation_id to DB: %v", err)
	}

	return installID, true, nil
}

// GenerateJWT creates a signed HS256 JWT for the frontend session.
// The token expires in 30 days (for developer convenience; reduce in production).
func (s *Service) GenerateJWT(userID, githubID int64, githubLogin string) (string, error) {
	claims := SentraClaims{
		UserID:      userID,
		GitHubID:    githubID,
		GitHubLogin: githubLogin,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "sentra-api-gateway",
			Subject:   fmt.Sprintf("%d", userID),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// ValidateJWT parses and validates a Sentra JWT, returning the embedded claims.
func (s *Service) ValidateJWT(tokenString string) (*SentraClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &SentraClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*SentraClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}
