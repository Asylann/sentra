package settings

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/usena/sentra/api-gateway/internal/auth"
)

// OrgSettings represents the full set of configurable AI analysis settings.
type OrgSettings struct {
	// Quality Gate: minimum score (0-100) for a PR to pass.
	QualityGateThreshold int `json:"quality_gate_threshold"`
	// DailyPRLimit: maximum PRs analyzed per developer per day (0 = unlimited).
	DailyPRLimit int `json:"daily_pr_limit"`
	// AnalysisFocus: list of categories the AI should prioritize.
	AnalysisFocus []string `json:"analysis_focus"`
	// CustomRulesText: free-text custom rules injected into the LLM system prompt.
	CustomRulesText string `json:"custom_rules_text"`
	// AutoApproveEnabled: if true, PRs scoring 100/100 are auto-approved.
	AutoApproveEnabled bool `json:"auto_approve_enabled"`
}

// Handler handles org settings GET/PUT routes.
type Handler struct {
	Pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{Pool: pool}
}

// GetOrgSettings handles GET /api/v1/orgs/:id/settings
// Returns the current effective settings for the organization.
func (h *Handler) GetOrgSettings(c *gin.Context) {
	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	// Verify the requesting user belongs to this org
	userID := auth.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Fetch org-level defaults
	var qualityGate int
	var dailyLimit int
	err = h.Pool.QueryRow(c, `
		SELECT quality_gate_threshold, daily_pr_limit
		FROM organizations
		WHERE id = $1
	`, orgID).Scan(&qualityGate, &dailyLimit)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "organization not found"})
		return
	}

	// Fetch the org-wide policy (repository_id IS NULL)
	var analysisFocus []string
	var customRules string
	var autoApprove bool
	err = h.Pool.QueryRow(c, `
		SELECT
			COALESCE(analysis_focus, ARRAY['Security','Complexity','Performance','Style']::TEXT[]),
			COALESCE(custom_rules_text, ''),
			COALESCE(auto_approve_enabled, false)
		FROM repository_policies
		WHERE organization_id = $1
		  AND repository_id IS NULL
		LIMIT 1
	`, orgID).Scan(&analysisFocus, &customRules, &autoApprove)
	if err != nil {
		// No policy row yet — return defaults
		analysisFocus = []string{"Security", "Complexity", "Performance", "Style"}
		customRules = ""
		autoApprove = false
	}

	c.JSON(http.StatusOK, OrgSettings{
		QualityGateThreshold: qualityGate,
		DailyPRLimit:         dailyLimit,
		AnalysisFocus:        analysisFocus,
		CustomRulesText:      customRules,
		AutoApproveEnabled:   autoApprove,
	})
}

// UpdateOrgSettings handles PUT /api/v1/orgs/:id/settings
// Persists updated settings for the organization.
func (h *Handler) UpdateOrgSettings(c *gin.Context) {
	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	userID := auth.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req OrgSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	// Validate quality gate threshold
	if req.QualityGateThreshold < 0 || req.QualityGateThreshold > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "quality_gate_threshold must be between 0 and 100"})
		return
	}

	// Validate daily PR limit
	if req.DailyPRLimit < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "daily_pr_limit must be >= 0"})
		return
	}

	// Begin transaction
	tx, err := h.Pool.Begin(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to begin transaction"})
		return
	}
	defer tx.Rollback(c)

	// 1. Update org-level fields (quality_gate_threshold, daily_pr_limit)
	_, err = tx.Exec(c, `
		UPDATE organizations
		SET
			quality_gate_threshold = $1,
			daily_pr_limit         = $2,
			updated_at             = NOW()
		WHERE id = $3
	`, req.QualityGateThreshold, req.DailyPRLimit, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update organization"})
		return
	}

	// 2. Upsert the org-wide policy row (repository_id IS NULL)
	_, err = tx.Exec(c, `
		INSERT INTO repository_policies (
			organization_id,
			repository_id,
			quality_gate_threshold,
			analysis_focus,
			custom_rules_text,
			auto_approve_enabled,
			updated_at
		) VALUES (
			$1, NULL, $2, $3::TEXT[], $4, $5, NOW()
		)
		ON CONFLICT (repository_id, organization_id)
		DO UPDATE SET
			quality_gate_threshold = EXCLUDED.quality_gate_threshold,
			analysis_focus         = EXCLUDED.analysis_focus,
			custom_rules_text      = EXCLUDED.custom_rules_text,
			auto_approve_enabled   = EXCLUDED.auto_approve_enabled,
			updated_at             = NOW()
	`, orgID, req.QualityGateThreshold, req.AnalysisFocus, req.CustomRulesText, req.AutoApproveEnabled)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update policy: " + err.Error()})
		return
	}

	if err := tx.Commit(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "settings updated successfully"})
}
