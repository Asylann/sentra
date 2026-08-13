package repos

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/usena/sentra/api-gateway/internal/auth"
	"github.com/usena/sentra/api-gateway/internal/db"
)

// Handler manages workspace-to-repository linking and active GitHub sync.
type Handler struct {
	Queries *db.Queries
	Pool    *pgxpool.Pool
}

func NewHandler(queries *db.Queries, pool *pgxpool.Pool) *Handler {
	return &Handler{Queries: queries, Pool: pool}
}

// githubRepo holds the minimal fields from the GitHub API repo response.
type githubRepo struct {
	ID       int64
	FullName string
	Private  bool
	OwnerID  int64
}

// fetchGitHubRepos calls GET /user/installations/{id}/repositories using a user OAuth token.
// Returns up to 100 repos (one page). The token must be a valid GitHub OAuth access token.
func fetchGitHubRepos(token string, installationID int64) ([]githubRepo, error) {
	url := fmt.Sprintf("https://api.github.com/user/installations/%d/repositories?per_page=100", installationID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github API %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Repositories []struct {
			ID       int64  `json:"id"`
			FullName string `json:"full_name"`
			Private  bool   `json:"private"`
			Owner    struct {
				ID int64 `json:"id"`
			} `json:"owner"`
		} `json:"repositories"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	out := make([]githubRepo, 0, len(result.Repositories))
	for _, r := range result.Repositories {
		out = append(out, githubRepo{
			ID:       r.ID,
			FullName: r.FullName,
			Private:  r.Private,
			OwnerID:  r.Owner.ID,
		})
	}
	return out, nil
}

// SyncInstallationRepos handles POST /api/v1/orgs/:id/repos/sync
// Fetches repos accessible via the user's GitHub App installation, upserts them into
// the repositories table, registers them in organization_repositories (is_active=false
// by default so existing user choices are preserved), then returns the full repo list
// with each repo's current is_linked status for this workspace.
func (h *Handler) SyncInstallationRepos(c *gin.Context) {
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

	user, err := h.Queries.GetUserByID(c, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	// If the user has a GitHub App installation and OAuth token, sync from GitHub API.
	if user.InstallationID.Valid && user.GithubAccessToken.Valid && user.GithubAccessToken.String != "" {
		ghRepos, fetchErr := fetchGitHubRepos(user.GithubAccessToken.String, user.InstallationID.Int64)
		if fetchErr == nil {
			for _, ghRepo := range ghRepos {
				// Try to find the canonical Sentra org for this repo's owner.
				ownerOrgID := orgID // fallback: use current workspace
				if found, lookupErr := h.Queries.FindOrgByGitHubID(c, ghRepo.OwnerID); lookupErr == nil {
					ownerOrgID = found
				}

				repoID, upsertErr := h.Queries.UpsertRepoForSync(c, db.UpsertRepoForSyncParams{
					GithubID:       ghRepo.ID,
					OrganizationID: ownerOrgID,
					FullName:       ghRepo.FullName,
					IsPrivate:      ghRepo.Private,
				})
				if upsertErr != nil {
					continue
				}

				// Register this repo in the workspace. Record who synced it (first writer wins)
				// so visibility filtering can distinguish "my repos" from "other members' repos".
				h.Pool.Exec(c, //nolint:errcheck
					`INSERT INTO organization_repositories (org_id, repo_id, is_active, synced_by_user_id)
					 VALUES ($1, $2, false, $3)
					 ON CONFLICT (org_id, repo_id) DO UPDATE
					 SET synced_by_user_id = COALESCE(organization_repositories.synced_by_user_id, EXCLUDED.synced_by_user_id)`,
					orgID, repoID, userID,
				)
			}
		}
		// GitHub fetch failures are non-fatal: we still return what's in the DB.
	}

	repos, err := h.Queries.GetOrgReposWithLinkStatus(c, db.GetOrgReposWithLinkStatusParams{OrgID: orgID, SyncedByUserID: userID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch repositories"})
		return
	}
	if repos == nil {
		repos = []db.GetOrgReposWithLinkStatusRow{}
	}
	c.JSON(http.StatusOK, gin.H{"data": repos})
}

// GetOrgRepos handles GET /api/v1/orgs/:id/repos
// Returns all repositories visible to the workspace with their is_linked status.
func (h *Handler) GetOrgRepos(c *gin.Context) {
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

	repos, err := h.Queries.GetOrgReposWithLinkStatus(c, db.GetOrgReposWithLinkStatusParams{OrgID: orgID, SyncedByUserID: userID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch repositories"})
		return
	}
	if repos == nil {
		repos = []db.GetOrgReposWithLinkStatusRow{}
	}
	c.JSON(http.StatusOK, gin.H{"data": repos})
}

// LinkOrgRepo handles PUT /api/v1/orgs/:id/repos/:repo_id
// Toggles whether a repository is linked (active) for this workspace.
// Body: {"is_active": true|false}
func (h *Handler) LinkOrgRepo(c *gin.Context) {
	orgID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid org ID"})
		return
	}

	repoID, err := strconv.ParseInt(c.Param("repo_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid repo ID"})
		return
	}

	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "is_active (bool) is required"})
		return
	}

	if err := h.Queries.LinkOrgRepository(c, db.LinkOrgRepositoryParams{
		OrgID:    orgID,
		RepoID:   repoID,
		IsActive: req.IsActive,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update repository link"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"is_active": req.IsActive})
}
