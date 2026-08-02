// Package users implements the user profile and installation check endpoints.
//
// Endpoints:
//
//	GET /api/v1/users/me                → Returns the authenticated user's profile
//	GET /api/v1/users/me/installation   → Checks if user has installed the GitHub App
package users

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"log"

	"github.com/usena/sentra/api-gateway/internal/auth"
)

// Handler handles the /api/v1/users/* endpoints.
type Handler struct {
	db      *pgxpool.Pool
	authSvc *auth.Service
}

// NewHandler constructs the users Handler.
func NewHandler(db *pgxpool.Pool, authSvc *auth.Service) *Handler {
	return &Handler{db: db, authSvc: authSvc}
}

// UserProfile is the JSON response for GET /api/v1/users/me
type UserProfile struct {
	ID             int64   `json:"id"`
	GitHubID       int64   `json:"github_id"`
	Login          string  `json:"login"`
	Name           *string `json:"name"`
	Email          *string `json:"email"`
	AvatarURL      *string `json:"avatar_url"`
	InstallationID *int64  `json:"installation_id"`
}

// Me returns the authenticated user's full profile from the database.
//
// GET /api/v1/users/me
func (h *Handler) Me(c *gin.Context) {
	ctx := c.Request.Context()
	userID := auth.GetUserID(c)

	var profile UserProfile
	err := h.db.QueryRow(ctx, `
		SELECT id, github_id, login, name, email, avatar_url, installation_id
		FROM users
		WHERE id = $1`,
		userID,
	).Scan(
		&profile.ID, &profile.GitHubID, &profile.Login,
		&profile.Name, &profile.Email, &profile.AvatarURL,
		&profile.InstallationID,
	)
	if err != nil {
		log.Printf("Failed to fetch user profile, user_id: %v, err: %v", userID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// InstallationStatus is the JSON response for GET /api/v1/users/me/installation
type InstallationStatus struct {
	Installed      bool   `json:"installed"`
	InstallationID *int64 `json:"installation_id,omitempty"`
	AppInstallURL  string `json:"app_install_url"`
}

// CheckInstallation checks whether the authenticated user has installed the Sentra GitHub App.
// It first checks the DB, then falls back to the GitHub API if DB shows null.
//
// GET /api/v1/users/me/installation
func (h *Handler) CheckInstallation(c *gin.Context) {
	ctx := c.Request.Context()
	userID := auth.GetUserID(c)

	// Get the user's current access token from DB for the GitHub API call
	var accessToken string
	err := h.db.QueryRow(ctx,
		`SELECT COALESCE(github_access_token, '') FROM users WHERE id = $1`, userID,
	).Scan(&accessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not retrieve user"})
		return
	}

	installID, installed, err := h.authSvc.GetUserInstallation(ctx, userID, accessToken)
	if err != nil {
		log.Printf("Failed to check installation, user_id: %v, err: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not check installation"})
		return
	}

	resp := InstallationStatus{
		Installed:     installed,
		AppInstallURL: "https://github.com/apps/sentra-devex/installations/new",
	}
	if installed {
		resp.InstallationID = &installID
	}

	c.JSON(http.StatusOK, resp)
}
