package organizations

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/usena/sentra/api-gateway/internal/auth"
	"github.com/usena/sentra/api-gateway/internal/db"
)

type Handler struct {
	Queries *db.Queries
	Pool    *pgxpool.Pool
}

func NewHandler(queries *db.Queries, pool *pgxpool.Pool) *Handler {
	return &Handler{Queries: queries, Pool: pool}
}

// GetOrgPRs handles GET /api/v1/orgs/:id/prs
func (h *Handler) GetOrgPRs(c *gin.Context) {
	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	// QueryArray returns all values for repeated query params: ?author=a&author=b
	authorLogins := c.QueryArray("author")
	limit := int32(200)

	if len(authorLogins) > 0 {
		// Fetch per-author and merge; avoids needing a variadic SQL IN clause
		seen := make(map[int64]struct{})
		var merged []db.GetOrgPullRequestsRow
		for _, login := range authorLogins {
			result, err := h.Queries.GetOrgPullRequestsByAuthor(c, db.GetOrgPullRequestsByAuthorParams{
				OrganizationID: orgID,
				Limit:          limit,
				AuthorLogin:    login,
			})
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch PRs"})
				return
			}
			for _, pr := range result {
				if _, dup := seen[pr.ID]; !dup {
					seen[pr.ID] = struct{}{}
					merged = append(merged, db.GetOrgPullRequestsRow(pr))
				}
			}
		}
		if merged == nil {
			merged = []db.GetOrgPullRequestsRow{}
		}
		c.JSON(http.StatusOK, gin.H{"data": merged})
		return
	}

	result, err := h.Queries.GetOrgPullRequests(c, db.GetOrgPullRequestsParams{
		OrganizationID: orgID,
		Limit:          limit,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch PRs"})
		return
	}
	if result == nil {
		result = []db.GetOrgPullRequestsRow{}
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
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

	switchErr := h.Queries.SetUserCurrentOrg(c, db.SetUserCurrentOrgParams{
		CurrentOrgID: pgtype.Int8{Int64: req.OrgID, Valid: true},
		ID:           userID,
	})
	if switchErr != nil {
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

// CreateWorkspace handles POST /api/v1/orgs
func (h *Handler) CreateWorkspace(c *gin.Context) {
	userID := auth.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	name := strings.TrimSpace(req.Name)
	if len(name) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace name must be at least 2 characters"})
		return
	}

	// Generate a unique login from timestamp (negative to avoid clash with GitHub IDs)
	uniqueLogin := fmt.Sprintf("ws-%d", time.Now().UnixNano())

	var orgID int64
	err := h.Pool.QueryRow(c, `
		WITH id_gen AS (
			SELECT -(EXTRACT(EPOCH FROM clock_timestamp()) * 1000000)::BIGINT AS v
		)
		INSERT INTO organizations
			(github_id, login, display_name, type, installation_id, plan_tier, is_active, quality_gate_threshold, workspace_type)
		SELECT v, $1, $2, 'Organization', v - 1, 'free', true, 80, 'company'
		FROM id_gen
		RETURNING id
	`, uniqueLogin, name).Scan(&orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create workspace"})
		return
	}

	if err := h.Queries.AddOrganizationUser(c, db.AddOrganizationUserParams{
		OrgID:  orgID,
		UserID: userID,
		Role:   "admin",
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to configure workspace"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"org_id": orgID})
}

// RenameWorkspace handles PUT /api/v1/orgs/:id
func (h *Handler) RenameWorkspace(c *gin.Context) {
	userID := auth.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	name := strings.TrimSpace(req.Name)
	if len(name) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace name must be at least 2 characters"})
		return
	}

	role, err := h.Queries.GetOrgMemberRole(c, orgID, userID)
	if err != nil || (role != "owner" && role != "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "only admins can rename workspaces"})
		return
	}

	if err := h.Queries.UpdateOrganizationDisplayName(c, db.UpdateOrganizationDisplayNameParams{
		DisplayName: pgtype.Text{String: name, Valid: true},
		ID:          orgID,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to rename workspace"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "workspace renamed"})
}

// DeleteWorkspace handles DELETE /api/v1/orgs/:id
// Cascade-deletes the org and all associated records (members, invites, repos, PRs).
func (h *Handler) DeleteWorkspace(c *gin.Context) {
	userID := auth.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	role, err := h.Queries.GetOrgMemberRole(c, orgID, userID)
	if err != nil || (role != "owner" && role != "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "only admins can delete workspaces"})
		return
	}

	// The schema sets ON DELETE CASCADE on all child tables, so a single DELETE cascades everything.
	if _, err := h.Pool.Exec(c, `DELETE FROM organizations WHERE id = $1`, orgID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete workspace"})
		return
	}

	// Best-effort: clear current_org_id for affected users (schema already handles via ON DELETE SET NULL)
	c.JSON(http.StatusOK, gin.H{"message": "workspace deleted"})
}

// UpdateMemberRole handles PUT /api/v1/orgs/:id/members/:user_id/role
func (h *Handler) UpdateMemberRole(c *gin.Context) {
	requesterID := auth.GetUserID(c)
	if requesterID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	targetUserID, err := strconv.ParseInt(c.Param("user_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role is required"})
		return
	}

	if req.Role != "admin" && req.Role != "member" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role must be 'admin' or 'member'"})
		return
	}

	requesterRole, err := h.Queries.GetOrgMemberRole(c, orgID, requesterID)
	if err != nil || (requesterRole != "owner" && requesterRole != "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "only admins can change roles"})
		return
	}

	if err := h.Queries.UpdateOrganizationUserRole(c, db.UpdateOrganizationUserRoleParams{
		Role:   req.Role,
		OrgID:  orgID,
		UserID: targetUserID,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "role updated"})
}

// RemoveMember handles DELETE /api/v1/orgs/:id/members/:user_id
func (h *Handler) RemoveMember(c *gin.Context) {
	requesterID := auth.GetUserID(c)
	if requesterID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	targetUserID, err := strconv.ParseInt(c.Param("user_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	requesterRole, err := h.Queries.GetOrgMemberRole(c, orgID, requesterID)
	if err != nil || (requesterRole != "owner" && requesterRole != "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "only admins can remove members"})
		return
	}

	if err := h.Queries.RemoveOrganizationUser(c, db.RemoveOrganizationUserParams{
		OrgID:  orgID,
		UserID: targetUserID,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member removed"})
}
