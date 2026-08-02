// Package auth — HTTP handler for GitHub OAuth login and callback endpoints.
//
// Endpoints:
//
//	GET /api/v1/auth/github/login    → redirects to GitHub OAuth consent page
//	GET /api/v1/auth/github/callback → exchanges code, issues JWT, redirects to frontend
package auth

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"log"
)

// Handler holds the HTTP handlers for authentication routes.
type Handler struct {
	svc         *Service
	frontendURL string
	appLink     string
}

// NewHandler constructs the auth Handler.
func NewHandler(svc *Service) *Handler {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	appLink := os.Getenv("GITHUB_APP_LINK")
	if appLink == "" {
		appLink = "https://github.com/apps/sentra-devex/installations/new"
	}
	return &Handler{
		svc:         svc,
		frontendURL: frontendURL,
		appLink:     appLink,
	}
}

// Login redirects the user to GitHub's OAuth authorization endpoint.
// A cryptographically random state is generated per-request to prevent CSRF.
//
// GET /api/v1/auth/github/login
func (h *Handler) Login(c *gin.Context) {
	state, err := generateState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate state"})
		return
	}

	// Store state in a short-lived cookie so we can verify it on callback.
	c.SetCookie("oauth_state", state, 600, "/", "", false, true)

	// Build GitHub OAuth URL. We request read access to the user profile.
	// The GitHub App's OAuth scope "read:user" gives us profile info.
	authURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&state=%s&scope=read:user,user:email",
		h.svc.GetClientID(), state,
	)

	log.Printf("Redirecting to GitHub OAuth, state: %v", state[:8]+"...")
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// Callback handles the OAuth redirect from GitHub after user authorization.
// It:
//  1. Validates the CSRF state cookie
//  2. Exchanges the code for an access token
//  3. Fetches the user profile from GitHub API
//  4. Upserts the user in our PostgreSQL users table
//  5. Generates a signed JWT
//  6. Redirects to the frontend with the JWT as a query parameter
//
// GET /api/v1/auth/github/callback
func (h *Handler) Callback(c *gin.Context) {
	ctx := c.Request.Context()

	// 1. Validate CSRF state
	cookieState, err := c.Cookie("oauth_state")
	if err != nil || cookieState == "" {
		log.Println("OAuth callback: missing state cookie")
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=missing_state")
		return
	}
	queryState := c.Query("state")
	if cookieState != queryState {
		log.Printf("OAuth state mismatch — possible CSRF, cookie: %v, query: %v", cookieState[:8], queryState[:8])
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=state_mismatch")
		return
	}
	// Clear the state cookie immediately after validation
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)

	// Handle user denying permission
	if errParam := c.Query("error"); errParam != "" {
		log.Printf("GitHub OAuth denied by user, error: %v", errParam)
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error="+errParam)
		return
	}

	code := c.Query("code")
	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=no_code")
		return
	}

	// 2. Exchange code for access token
	accessToken, err := h.svc.ExchangeCodeForToken(ctx, code)
	if err != nil {
		log.Printf("Failed to exchange OAuth code: %v", err)
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=token_exchange_failed")
		return
	}

	// 3. Fetch GitHub user profile
	ghUser, err := h.svc.FetchGitHubUser(ctx, accessToken)
	if err != nil {
		log.Printf("Failed to fetch GitHub user: %v", err)
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=user_fetch_failed")
		return
	}

	// 4. Upsert user in our database
	userID, err := h.svc.UpsertUser(ctx, ghUser, accessToken)
	if err != nil {
		log.Printf("Failed to upsert user, login: %v, err: %v", ghUser.Login, err)
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=db_error")
		return
	}

	log.Printf("User authenticated via GitHub OAuth, user_id: %v, login: %v", userID, ghUser.Login)
	// 5. Generate a signed JWT for the frontend session
	jwtToken, err := h.svc.GenerateJWT(userID, ghUser.ID, ghUser.Login)
	if err != nil {
		log.Printf("Failed to generate JWT: %v", err)
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+"/login?error=jwt_error")
		return
	}

	// 6. Redirect to the frontend auth callback with JWT as query param.
	// The frontend's /auth/callback page extracts this token and stores it.
	redirectURL := fmt.Sprintf("%s/auth/callback?token=%s", h.frontendURL, jwtToken)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

// generateState creates a cryptographically random base64-encoded state string.
func generateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
