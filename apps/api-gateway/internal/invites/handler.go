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

	// Query by email first (if present), then also by GitHub login — deduplicated by invite ID.
	seen := map[int64]struct{}{}
	var combined []db.GetUserPendingInvitesRow

	if user.Email.Valid && user.Email.String != "" {
		byEmail, err := h.Queries.GetUserPendingInvites(c, user.Email.String)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch invites"})
			return
		}
		for _, inv := range byEmail {
			if _, ok := seen[inv.ID]; !ok {
				seen[inv.ID] = struct{}{}
				combined = append(combined, inv)
			}
		}
	}

	// Also look up by GitHub login in case the invite was sent with the login field.
	if user.Login != "" {
		loginText := pgtype.Text{String: user.Login, Valid: true}
		byLogin, err := h.Queries.GetUserPendingInvitesByLogin(c, loginText)
		if err == nil { // best-effort; don't fail if query doesn't exist yet
			for _, inv := range byLogin {
				if _, ok := seen[inv.ID]; !ok {
					seen[inv.ID] = struct{}{}
					combined = append(combined, inv)
				}
			}
		}
	}

	if combined == nil {
		combined = []db.GetUserPendingInvitesRow{}
	}

	c.JSON(http.StatusOK, gin.H{"data": combined})
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
		Email       string `json:"email"`
		GitHubLogin string `json:"github_login"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	// Require at least one of email or github_login
	if req.Email == "" && req.GitHubLogin == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email or github_login is required"})
		return
	}

	ghLogin := pgtype.Text{}
	if req.GitHubLogin != "" {
		ghLogin = pgtype.Text{String: req.GitHubLogin, Valid: true}
	}

	// If email is empty but github_login is given, try to resolve the email from the DB.
	// This lets you invite teammates by GitHub username alone.
	targetEmail := req.Email
	if targetEmail == "" && req.GitHubLogin != "" {
		if lookedUp, lookupErr := h.Queries.GetUserByLogin(c, req.GitHubLogin); lookupErr == nil {
			if lookedUp.Email.Valid && lookedUp.Email.String != "" {
				targetEmail = lookedUp.Email.String
			}
		}
		// If still empty, use a stable synthetic placeholder
		if targetEmail == "" {
			targetEmail = "invite-by-login@" + req.GitHubLogin + ".github"
		}
	}

	id, err := h.Queries.CreateInvite(c, db.CreateInviteParams{
		OrgID:             orgID,
		InviterID:         userID,
		TargetEmail:       targetEmail,
		TargetGithubLogin: ghLogin,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create invite"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"invite_id": id})
}

// GetOrgPendingInvites handles GET /api/v1/orgs/:id/invites/pending
func (h *Handler) GetOrgPendingInvites(c *gin.Context) {
	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	invites, err := h.Queries.GetOrgPendingInvites(c, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch pending invites"})
		return
	}

	if invites == nil {
		invites = []db.GetOrgPendingInvitesRow{}
	}

	c.JSON(http.StatusOK, gin.H{"data": invites})
}
