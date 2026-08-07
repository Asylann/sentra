package onboarding

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/usena/sentra/api-gateway/internal/auth"
	"github.com/usena/sentra/api-gateway/internal/db"
)

type Handler struct {
	Queries *db.Queries
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{Queries: queries}
}

// CompleteOnboarding handles POST /api/v1/auth/onboarding
func (h *Handler) CompleteOnboarding(c *gin.Context) {
	userID := auth.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req struct {
		WorkspaceType string `json:"workspace_type" binding:"required"`
		OrgName       string `json:"org_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace_type is required"})
		return
	}

	if req.WorkspaceType != "personal" && req.WorkspaceType != "company" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace_type must be 'personal' or 'company'"})
		return
	}

	ghID, _ := c.Get(auth.ContextKeyGitHubID)
	ghLogin, _ := c.Get(auth.ContextKeyGitHubLogin)
	githubID := ghID.(int64)
	login := ghLogin.(string)

	var orgID int64
	var err error

	if req.WorkspaceType == "personal" {
		orgID, err = h.createPersonalOrg(c, githubID, login)
	} else {
		name := req.OrgName
		if name == "" {
			name = login + "'s Team"
		}
		orgID, err = h.createCompanyOrg(c, githubID, login, name)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create workspace"})
		return
	}

	err = h.Queries.AddOrganizationUser(c, db.AddOrganizationUserParams{
		OrgID:  orgID,
		UserID: userID,
		Role:   "admin",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add user to workspace"})
		return
	}

	err = h.Queries.SetUserCurrentOrg(c, db.SetUserCurrentOrgParams{
		CurrentOrgID: &orgID,
		ID:           userID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set current workspace"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"org_id":         orgID,
		"workspace_type": req.WorkspaceType,
	})
}

func (h *Handler) createPersonalOrg(c *gin.Context, githubID int64, login string) (int64, error) {
	return h.Queries.CreatePersonalOrganization(c, db.CreatePersonalOrganizationParams{
		GithubID:       githubID,
		Login:          login + "-personal",
		DisplayName:    &login,
		AvatarUrl:      nil,
		InstallationID: 0,
	})
}

func (h *Handler) createCompanyOrg(c *gin.Context, githubID int64, login string, name string) (int64, error) {
	return h.Queries.CreateCompanyOrganization(c, db.CreateCompanyOrganizationParams{
		GithubID:       githubID,
		Login:          login + "-company",
		DisplayName:    &name,
		AvatarUrl:      nil,
		InstallationID: 0,
	})
}
