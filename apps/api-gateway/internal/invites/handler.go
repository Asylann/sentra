package invites

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/usena/sentra/api-gateway/internal/auth"
	"github.com/usena/sentra/api-gateway/internal/db"
)

type Handler struct {
	Queries *db.Queries
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{Queries: queries}
}

// GetMyInvites handles GET /api/v1/users/me/invites
func (h *Handler) GetMyInvites(c *gin.Context) {
	userID := auth.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.Queries.GetUserByID(c, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	if !user.Email.Valid || user.Email.String == "" {
		c.JSON(http.StatusOK, gin.H{"data": []any{}})
		return
	}

	invites, err := h.Queries.GetUserPendingInvites(c, user.Email.String)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch invites"})
		return
	}

	if invites == nil {
		invites = []db.GetUserPendingInvitesRow{}
	}

	c.JSON(http.StatusOK, gin.H{"data": invites})
}

// RespondToInvite handles POST /api/v1/invites/:id/respond
func (h *Handler) RespondToInvite(c *gin.Context) {
	userID := auth.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	inviteID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invite ID"})
		return
	}

	var req struct {
		Action string `json:"action" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "action is required (accept/decline)"})
		return
	}

	if req.Action != "accept" && req.Action != "decline" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "action must be 'accept' or 'decline'"})
		return
	}

	invite, err := h.Queries.GetInviteByID(c, inviteID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "invite not found"})
		return
	}

	if invite.Status != "pending" {
		c.JSON(http.StatusConflict, gin.H{"error": "invite already responded to"})
		return
	}

	status := "declined"
	if req.Action == "accept" {
		status = "accepted"
	}

	err = h.Queries.UpdateInviteStatus(c, db.UpdateInviteStatusParams{
		Status: status,
		ID:     inviteID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update invite"})
		return
	}

	if req.Action == "accept" {
		err = h.Queries.AddOrganizationUser(c, db.AddOrganizationUserParams{
			OrgID:  invite.OrgID,
			UserID: userID,
			Role:   "member",
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to join organization"})
			return
		}

		_ = h.Queries.SetUserCurrentOrg(c, db.SetUserCurrentOrgParams{
			CurrentOrgID: pgtype.Int8{Int64: invite.OrgID, Valid: true},
			ID:           userID,
		})
	}

	c.JSON(http.StatusOK, gin.H{"status": status})
}

// CreateInvite handles POST /api/v1/orgs/:id/invites
func (h *Handler) CreateInvite(c *gin.Context) {
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
		Email       string `json:"email" binding:"required"`
		GitHubLogin string `json:"github_login"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email is required"})
		return
	}

	ghLogin := pgtype.Text{}
	if req.GitHubLogin != "" {
		ghLogin = pgtype.Text{String: req.GitHubLogin, Valid: true}
	}

	id, err := h.Queries.CreateInvite(c, db.CreateInviteParams{
		OrgID:             orgID,
		InviterID:         userID,
		TargetEmail:       req.Email,
		TargetGithubLogin: ghLogin,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create invite"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"invite_id": id})
}
