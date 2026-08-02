// Package auth — JWT authentication middleware for Gin.
//
// Usage:
//
//	protected := router.Group("/api/v1")
//	protected.Use(auth.AuthRequired(authSvc))
//	protected.GET("/users/me", usersHandler.Me)
package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	// ContextKeyUserID is the gin context key for the authenticated user's DB ID.
	ContextKeyUserID = "auth_user_id"
	// ContextKeyGitHubID is the gin context key for the authenticated user's GitHub ID.
	ContextKeyGitHubID = "auth_github_id"
	// ContextKeyGitHubLogin is the gin context key for the authenticated user's GitHub login.
	ContextKeyGitHubLogin = "auth_github_login"
	// ContextKeyAccessToken is the gin context key for the user's GitHub access token.
	ContextKeyAccessToken = "auth_access_token"
)

// AuthRequired returns a Gin middleware that validates the Bearer JWT on each request.
// On success, it injects the user claims into the Gin context for downstream handlers.
// On failure, it aborts with 401 Unauthorized.
func AuthRequired(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenStr string

		// 1. Try to get token from Authorization header: "Bearer <token>"
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
				tokenStr = parts[1]
			}
		}

		// 2. Fallback to query parameter (required for WebSockets)
		if tokenStr == "" {
			tokenStr = c.Query("token")
		}

		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "missing or invalid authorization token",
			})
			return
		}

		claims, err := svc.ValidateJWT(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid or expired token",
			})
			return
		}

		// Inject claims into Gin context for use by downstream handlers
		c.Set("claims", claims) // Inject the entire claims object so handlers like WS can use it directly
		c.Set(ContextKeyUserID, claims.UserID)
		c.Set(ContextKeyGitHubID, claims.GitHubID)
		c.Set(ContextKeyGitHubLogin, claims.GitHubLogin)

		c.Next()
	}
}

// GetUserID extracts the authenticated user's DB ID from the Gin context.
// Panics if called outside of a route protected by AuthRequired.
func GetUserID(c *gin.Context) int64 {
	val, _ := c.Get(ContextKeyUserID)
	id, _ := val.(int64)
	return id
}

// GetGitHubLogin extracts the authenticated user's GitHub login from the Gin context.
func GetGitHubLogin(c *gin.Context) string {
	val, _ := c.Get(ContextKeyGitHubLogin)
	login, _ := val.(string)
	return login
}
