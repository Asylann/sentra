package dashboard

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/usena/sentra/api-gateway/internal/auth"
	"github.com/usena/sentra/api-gateway/internal/db"
)

type DashboardHandler struct {
	Queries *db.Queries
}

func NewDashboardHandler(queries *db.Queries) *DashboardHandler {
	return &DashboardHandler{
		Queries: queries,
	}
}

func (h *DashboardHandler) GetPullRequests(c *gin.Context) {
	limit := int32(200)

	prs, err := h.Queries.GetRecentPullRequests(c, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch pull requests"})
		return
	}

	if prs == nil {
		prs = []db.GetRecentPullRequestsRow{}
	}

	// For personal workspaces, filter PRs by the authenticated user's GitHub login.
	// This ensures users only see their own PRs when not in a company workspace.
	userLogin, exists := c.Get(auth.ContextKeyGitHubLogin)
	if exists {
		loginStr := userLogin.(string)
		var filtered []db.GetRecentPullRequestsRow
		for _, pr := range prs {
			if strings.EqualFold(pr.AuthorLogin, loginStr) {
				filtered = append(filtered, pr)
			}
		}
		prs = filtered
		if prs == nil {
			prs = []db.GetRecentPullRequestsRow{}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": prs,
	})
}

func (h *DashboardHandler) GetMetrics(c *gin.Context) {
	metrics, err := h.Queries.GetOrganizationMetrics(c)
	if err != nil {
		metrics = db.GetOrganizationMetricsRow{}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": metrics,
	})
}

func (h *DashboardHandler) GetRepositories(c *gin.Context) {
	repos, err := h.Queries.GetRepositories(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch repositories"})
		return
	}

	if repos == nil {
		repos = []db.GetRepositoriesRow{}
	}

	userLogin, exists := c.Get(auth.ContextKeyGitHubLogin)
	if exists {
		var filtered []db.GetRepositoriesRow
		loginStr := userLogin.(string)
		for _, r := range repos {
			if strings.HasPrefix(strings.ToLower(r.FullName), strings.ToLower(loginStr)+"/") {
				filtered = append(filtered, r)
			}
		}
		repos = filtered
	}

	c.JSON(http.StatusOK, gin.H{
		"data": repos,
	})
}

func (h *DashboardHandler) GetPullRequest(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid PR ID"})
		return
	}

	pr, err := h.Queries.GetPullRequestByID(c, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pull request not found"})
		return
	}

	findings, err := h.Queries.GetReviewFindingsForPR(c, id)
	if err != nil {
		findings = []db.GetReviewFindingsForPRRow{}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"pr":       pr,
			"findings": findings,
		},
	})
}
