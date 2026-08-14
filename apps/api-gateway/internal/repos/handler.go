package repos

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
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

// fetchGitHubRepos calls GET /user/installations/{id}/repositories using a user
// OAuth token. Returns up to 100 repos (one page).
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
//
// Fetches repos accessible via the user's GitHub App installation, upserts them
// into the repositories table, ensures they appear in organization_repositories
// (preserving the existing is_active choice), and records the current user in
// organization_repository_syncs so they retain visibility even after unlinking.
//
// Returns all repos visible to the calling user for this workspace:
//   - their own repos (synced by them — linked or unlinked)
//   - any repos currently linked to the workspace by other members
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

	// Sync from GitHub API when the user has a valid installation + OAuth token.
	if user.InstallationID.Valid && user.GithubAccessToken.Valid && user.GithubAccessToken.String != "" {
		ghRepos, fetchErr := fetchGitHubRepos(user.GithubAccessToken.String, user.InstallationID.Int64)
		if fetchErr != nil {
			log.Printf("SyncInstallationRepos: GitHub API fetch failed for user %d: %v", userID, fetchErr)
			if strings.Contains(fetchErr.Error(), "401") {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "GitHub token expired. Please log in again."})
				return
			}
			// Non-fatal for other errors: return whatever is already in the DB for this user.
		} else {
			for _, ghRepo := range ghRepos {
				// Resolve the canonical Sentra org for this repo's GitHub owner.
				ownerOrgID := orgID
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
					log.Printf("SyncInstallationRepos: upsert failed for repo %s: %v", ghRepo.FullName, upsertErr)
					continue
				}

				// Register the repo in this workspace (default unlinked; preserve existing choice).
				h.Pool.Exec(c, //nolint:errcheck
					`INSERT INTO organization_repositories (org_id, repo_id, is_active)
					 VALUES ($1, $2, false)
					 ON CONFLICT (org_id, repo_id) DO NOTHING`,
					orgID, repoID,
				)

				// Record that THIS user synced this repo so they retain visibility
				// even when is_active = false (i.e. after unlinking).
				if err := h.Queries.RegisterRepoSync(c, db.RegisterRepoSyncParams{
					OrgID:  orgID,
					RepoID: repoID,
					UserID: userID,
				}); err != nil {
					log.Printf("SyncInstallationRepos: RegisterRepoSync failed for repo %d user %d: %v", repoID, userID, err)
				}
			}
		}
	}

	repos, err := h.Queries.GetOrgReposWithLinkStatus(c, db.GetOrgReposWithLinkStatusParams{
		OrgID:  orgID,
		UserID: userID,
	})
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
// Returns all repos visible to the calling user (their own + workspace-linked).
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

	repos, err := h.Queries.GetOrgReposWithLinkStatus(c, db.GetOrgReposWithLinkStatusParams{
		OrgID:  orgID,
		UserID: userID,
	})
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
//
// When a user explicitly links a repo through the UI, they are also registered
// as a syncer so they retain visibility if they later unlink it.
func (h *Handler) LinkOrgRepo(c *gin.Context) {
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

	// Claim ownership so this user keeps visibility after unlinking.
	if err := h.Queries.RegisterRepoSync(c, db.RegisterRepoSyncParams{
		OrgID:  orgID,
		RepoID: repoID,
		UserID: userID,
	}); err != nil {
		log.Printf("LinkOrgRepo: RegisterRepoSync failed for repo %d user %d: %v", repoID, userID, err)
	}

	c.JSON(http.StatusOK, gin.H{"is_active": req.IsActive})
}
