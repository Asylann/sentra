package organizations

import (
	"net/http"
	"strconv"

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

// GetOrgPRs handles GET /api/v1/orgs/:id/prs
func (h *Handler) GetOrgPRs(c *gin.Context) {
	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	authorLogin := c.Query("author")
	limit := int32(50)

	var prs interface{}
	if authorLogin != "" {
		result, err := h.Queries.GetOrgPullRequestsByAuthor(c, db.GetOrgPullRequestsByAuthorParams{
			OrganizationID: orgID,
			Limit:          limit,
			AuthorLogin:    authorLogin,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch PRs"})
			return
		}
		prs = result
	} else {
		result, err := h.Queries.GetOrgPullRequests(c, db.GetOrgPullRequestsParams{
			OrganizationID: orgID,
			Limit:          limit,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch PRs"})
			return
		}
		prs = result
	}

	c.JSON(http.StatusOK, gin.H{"data": prs})
}

// GetLeaderboard handles GET /api/v1/orgs/:id/leaderboard
func (h *Handler) GetLeaderboard(c *gin.Context) {
	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	leaders, err := h.Queries.GetOrgLeaderboard(c, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch leaderboard"})
		return
	}

	if leaders == nil {
		leaders = []db.GetOrgLeaderboardRow{}
	}

	c.JSON(http.StatusOK, gin.H{"data": leaders})
}

// GetMyOrganizations handles GET /api/v1/users/me/orgs
func (h *Handler) GetMyOrganizations(c *gin.Context) {
	userID := auth.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	orgs, err := h.Queries.GetUserOrganizations(c, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch organizations"})
		return
	}

	if orgs == nil {
		orgs = []db.GetUserOrganizationsRow{}
	}

	c.JSON(http.StatusOK, gin.H{"data": orgs})
}

// SwitchOrganization handles POST /api/v1/users/me/orgs/switch
func (h *Handler) SwitchOrganization(c *gin.Context) {
	userID := auth.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req struct {
		OrgID int64 `json:"org_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org_id is required"})
		return
	}

	err := h.Queries.SetUserCurrentOrg(c, db.SetUserCurrentOrgParams{
		CurrentOrgID: &req.OrgID,
		ID:           userID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to switch workspace"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"org_id": req.OrgID})
}

// GetOrgMembers handles GET /api/v1/orgs/:id/members
func (h *Handler) GetOrgMembers(c *gin.Context) {
	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	members, err := h.Queries.GetOrgMembers(c, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch members"})
		return
	}

	if members == nil {
		members = []db.GetOrgMembersRow{}
	}

	c.JSON(http.StatusOK, gin.H{"data": members})
}
