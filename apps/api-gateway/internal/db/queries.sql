-- =============================================================================
-- Sentra API Gateway — sqlc Queries
-- =============================================================================
-- These raw SQL queries are compiled by sqlc into type-safe Go functions.
-- We use this for the hot webhook ingestion path where ORM overhead is unacceptable.
-- =============================================================================

-- name: InsertWebhookPayload :one
-- Inserts the raw GitHub webhook payload into the immutable audit log.
-- Part 1 of the Transactional Outbox.
INSERT INTO webhook_payloads (
    delivery_id,
    event_type,
    action,
    installation_id,
    organization_id,
    repository_id,
    sender_login,
    payload,
    signature_valid
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;


-- name: InsertOutboxEvent :one
-- Inserts a pending message for Kafka delivery.
-- Part 2 of the Transactional Outbox. Must be run in the same db.Tx as InsertWebhookPayload.
INSERT INTO outbox_events (
    aggregate_id,
    event_type,
    kafka_topic,
    payload_proto,
    status,
    retry_count
) VALUES (
    $1, $2, $3, $4, 'pending', 0
)
RETURNING *;


-- name: GetAndLockPendingOutboxEvents :many
-- Fetches a batch of pending events for the Kafka Relay Worker and locks them.
-- Uses SKIP LOCKED to allow multiple worker goroutines/pods to poll concurrently
-- without blocking each other or double-processing messages.
-- Research1 §2.3: Transactional Outbox pattern.
SELECT
    id,
    aggregate_id,
    event_type,
    kafka_topic,
    payload_proto,
    status,
    created_at,
    retry_count
FROM outbox_events
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT $1
FOR UPDATE SKIP LOCKED;


-- name: MarkOutboxEventPublished :exec
-- Marks an outbox event as successfully published to Kafka.
UPDATE outbox_events
SET
    status = 'published',
    published_at = NOW()
WHERE id = $1;


-- name: MarkOutboxEventFailed :exec
-- Increments retry count and sets error details. If retries exceed limit, status becomes 'failed'.
UPDATE outbox_events
SET
    retry_count = retry_count + 1,
    last_error = @last_error::text,
    status = CASE WHEN retry_count + 1 >= @max_retries::int THEN 'failed' ELSE 'pending' END
WHERE id = @id;


-- =============================================================================
-- User Authentication Queries (Phase 11: GitHub OAuth)
-- =============================================================================

-- name: UpsertUser :one
-- Creates or updates a user based on their GitHub ID (upsert on conflict).
-- Returns the full user row after insert/update.
INSERT INTO users (
    github_id,
    login,
    name,
    email,
    avatar_url,
    github_access_token,
    installation_id,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, NOW()
)
ON CONFLICT (github_id) DO UPDATE
SET
    login               = EXCLUDED.login,
    name                = EXCLUDED.name,
    email               = EXCLUDED.email,
    avatar_url          = EXCLUDED.avatar_url,
    github_access_token = EXCLUDED.github_access_token,
    installation_id     = COALESCE(EXCLUDED.installation_id, users.installation_id),
    updated_at          = NOW()
RETURNING *;


-- name: GetUserByGitHubID :one
-- Fetches a user by their GitHub numeric ID.
SELECT * FROM users
WHERE github_id = $1
LIMIT 1;


-- name: GetUserByID :one
-- Fetches a user by their internal Sentra DB ID (used after JWT validation).
SELECT * FROM users
WHERE id = $1
LIMIT 1;


-- name: SetUserInstallationID :exec
-- Updates the installation_id for a user when they install the GitHub App.
UPDATE users
SET
    installation_id = $1,
    updated_at      = NOW()
WHERE github_id = $2;


-- =============================================================================
-- Dashboard Queries (Phase 12)
-- =============================================================================

-- name: UpsertOrganization :one
-- Ensures the organization exists before inserting dependent records.
INSERT INTO organizations (
    github_id, login, type, installation_id, plan_tier, is_active, quality_gate_threshold
) VALUES (
    $1, $2, $3, $4, 'free', true, 80
) ON CONFLICT (github_id) DO UPDATE
SET login = EXCLUDED.login, type = EXCLUDED.type, installation_id = EXCLUDED.installation_id
RETURNING id;

-- name: UpsertRepository :one
-- Ensures the repository exists before inserting dependent records.
INSERT INTO repositories (
    github_id, organization_id, full_name, is_private, name, default_branch, is_active, analysis_enabled, total_prs_analyzed
) VALUES (
    $1, $2, $3, $4, split_part($3, '/', 2), 'main', true, true, 0
) ON CONFLICT (github_id) DO UPDATE
SET full_name = EXCLUDED.full_name, is_private = EXCLUDED.is_private
RETURNING id;

-- name: GetRepositories :many
-- Fetches all repositories for the organization.
SELECT
    id,
    github_id,
    organization_id,
    name,
    full_name,
    is_private,
    is_active,
    analysis_enabled,
    avg_quality_score,
    total_prs_analyzed,
    created_at
FROM repositories
ORDER BY full_name ASC;

-- name: GetRecentPullRequests :many
-- Fetches the most recent PRs across all repositories for the organization.
SELECT
    pr.id,
    pr.title,
    pr.pull_number,
    pr.author_login,
    pr.state,
    pr.merged_at,
    pr.analysis_status,
    pr.quality_score,
    pr.merge_blocked,
    pr.findings_critical,
    pr.findings_high,
    pr.findings_medium,
    pr.findings_low,
    pr.findings_info,
    pr.created_at,
    r.full_name AS repository_full_name
FROM pull_requests pr
JOIN repositories r ON pr.repository_id = r.id
ORDER BY pr.created_at DESC
LIMIT $1;


-- name: GetOrganizationMetrics :one
-- Computes aggregate metrics from the rollup table.
SELECT
    COALESCE(SUM(deployments_count), 0)::int AS total_deployments,
    COALESCE(SUM(prs_merged), 0)::int AS total_prs_merged,
    COALESCE(SUM(prs_reverted), 0)::int AS total_prs_reverted,
    COALESCE(AVG(avg_quality_score), 0)::float AS average_quality_score,
    COALESCE(SUM(prs_blocked), 0)::int AS total_prs_blocked
FROM dora_daily_rollup
WHERE date >= NOW() - INTERVAL '30 days';

-- name: GetPullRequestByID :one
-- Fetches a single Pull Request by its ID.
SELECT
    pr.id,
    pr.github_pr_id,
    pr.pull_number,
    pr.title,
    pr.body,
    pr.author_login,
    pr.state,
    pr.merged_at,
    pr.analysis_status,
    pr.quality_score,
    pr.findings_critical,
    pr.findings_high,
    pr.findings_medium,
    pr.findings_low,
    pr.findings_info,
    pr.created_at,
    r.full_name AS repository_full_name
FROM pull_requests pr
JOIN repositories r ON pr.repository_id = r.id
WHERE pr.id = $1
LIMIT 1;

-- name: GetReviewFindingsForPR :many
-- Fetches all review findings for a specific pull request.
SELECT
    id,
    file_path,
    line_start,
    line_end,
    category,
    severity,
    title,
    description,
    suggested_fix
FROM review_findings
WHERE pull_request_id = $1
ORDER BY line_start ASC;


-- =============================================================================
-- B2B Multi-Tenancy Queries (Phase: B2B SaaS Pivot)
-- =============================================================================

-- name: CreatePersonalOrganization :one
-- Creates a personal workspace org for an individual user.
INSERT INTO organizations (
    github_id, login, display_name, avatar_url, type, installation_id,
    plan_tier, is_active, quality_gate_threshold, workspace_type
) VALUES (
    $1, $2, $3, $4, 'User', $5, 'free', true, 80, 'personal'
)
ON CONFLICT (github_id) DO UPDATE SET login = EXCLUDED.login
RETURNING id;

-- name: CreateCompanyOrganization :one
-- Creates a company workspace org for a team.
INSERT INTO organizations (
    github_id, login, display_name, avatar_url, type, installation_id,
    plan_tier, is_active, quality_gate_threshold, workspace_type
) VALUES (
    $1, $2, $3, $4, 'Organization', $5, 'free', true, 80, 'company'
)
ON CONFLICT (github_id) DO UPDATE SET login = EXCLUDED.login
RETURNING id;

-- name: AddOrganizationUser :exec
-- Adds a user to an organization with a given role.
INSERT INTO organization_users (org_id, user_id, role)
VALUES ($1, $2, $3)
ON CONFLICT (org_id, user_id) DO NOTHING;

-- name: SetUserCurrentOrg :exec
-- Sets the user's active workspace.
UPDATE users SET current_org_id = $1, updated_at = NOW() WHERE id = $2;

-- name: GetUserOrganizations :many
-- Fetches all active organizations a user belongs to (excludes soft-deleted workspaces).
SELECT
    o.id, o.login, o.display_name, o.avatar_url, o.workspace_type,
    ou.role, ou.joined_at
FROM organization_users ou
JOIN organizations o ON o.id = ou.org_id
WHERE ou.user_id = $1 AND o.is_active = true
ORDER BY ou.joined_at ASC;

-- name: GetUserPendingInvites :many
-- Fetches pending invites for a user by their email.
SELECT
    i.id, i.org_id, i.target_email, i.status, i.created_at,
    o.login AS org_login, o.display_name AS org_display_name, o.avatar_url AS org_avatar_url,
    u.login AS inviter_login
FROM organization_invites i
JOIN organizations o ON o.id = i.org_id
JOIN users u ON u.id = i.inviter_id
WHERE i.target_email = $1 AND i.status = 'pending'
ORDER BY i.created_at DESC;

-- name: GetInviteByID :one
-- Fetches an invite by its ID.
SELECT id, org_id, inviter_id, target_email, status
FROM organization_invites
WHERE id = $1;

-- name: UpdateInviteStatus :exec
-- Accepts or declines an invite.
UPDATE organization_invites
SET status = $1, updated_at = NOW()
WHERE id = $2;

-- name: CreateInvite :one
-- Creates a new organization invite.
INSERT INTO organization_invites (org_id, inviter_id, target_email, target_github_login, status)
VALUES ($1, $2, $3, $4, 'pending')
ON CONFLICT (org_id, target_email) DO UPDATE SET status = 'pending', updated_at = NOW()
RETURNING id;

-- name: GetOrgPullRequests :many
-- Fetches PRs for a specific organization, respecting workspace repo selection.
SELECT
    pr.id,
    pr.title,
    pr.pull_number,
    pr.author_login,
    pr.state,
    pr.merged_at,
    pr.analysis_status,
    pr.quality_score,
    pr.merge_blocked,
    pr.findings_critical,
    pr.findings_high,
    pr.findings_medium,
    pr.findings_low,
    pr.findings_info,
    pr.created_at,
    r.full_name AS repository_full_name
FROM pull_requests pr
JOIN repositories r ON pr.repository_id = r.id
WHERE (pr.organization_id = $1
   OR pr.author_login IN (
       SELECT u.login FROM organization_users ou
       JOIN users u ON u.id = ou.user_id
       WHERE ou.org_id = $1
   ))
  AND (
    NOT EXISTS (SELECT 1 FROM organization_repositories WHERE org_id = $1 AND is_active = true)
    OR pr.repository_id IN (SELECT repo_id FROM organization_repositories WHERE org_id = $1 AND is_active = true)
  )
ORDER BY pr.created_at DESC
LIMIT $2;

-- name: GetOrgPullRequestsByAuthor :many
-- Fetches PRs for a specific organization filtered by author login, respecting workspace repo selection.
SELECT
    pr.id,
    pr.title,
    pr.pull_number,
    pr.author_login,
    pr.state,
    pr.merged_at,
    pr.analysis_status,
    pr.quality_score,
    pr.merge_blocked,
    pr.findings_critical,
    pr.findings_high,
    pr.findings_medium,
    pr.findings_low,
    pr.findings_info,
    pr.created_at,
    r.full_name AS repository_full_name
FROM pull_requests pr
JOIN repositories r ON pr.repository_id = r.id
WHERE (pr.organization_id = $1 AND pr.author_login = $3)
  AND (
    NOT EXISTS (SELECT 1 FROM organization_repositories WHERE org_id = $1 AND is_active = true)
    OR pr.repository_id IN (SELECT repo_id FROM organization_repositories WHERE org_id = $1 AND is_active = true)
  )
ORDER BY pr.created_at DESC
LIMIT $2;

-- name: GetOrgLeaderboard :many
-- Engineering leaderboard: group by developer, count PRs, avg quality, performance index.
-- Respects workspace repo selection: if any repos are linked to this workspace,
-- only PRs from those repos are counted (leaderboard isolation).
-- Falls back to org-wide / member PRs when no repos are explicitly linked.
SELECT
    pr.author_login,
    COUNT(pr.id)::int AS pr_count,
    COALESCE(AVG(pr.quality_score), 0)::float AS avg_quality_score,
    (COUNT(pr.id) * COALESCE(AVG(pr.quality_score), 50) / 100.0)::float AS performance_index
FROM pull_requests pr
WHERE (pr.organization_id = $1
   OR pr.author_login IN (
       SELECT u.login FROM organization_users ou
       JOIN users u ON u.id = ou.user_id
       WHERE ou.org_id = $1
   ))
  AND (
    NOT EXISTS (SELECT 1 FROM organization_repositories WHERE org_id = $1 AND is_active = true)
    OR pr.repository_id IN (SELECT repo_id FROM organization_repositories WHERE org_id = $1 AND is_active = true)
  )
  AND pr.analysis_status = 'completed'
  AND pr.quality_score IS NOT NULL
GROUP BY pr.author_login
ORDER BY performance_index DESC;

-- name: GetOrgMembers :many
-- Fetches all members of an organization.
SELECT
    ou.user_id, ou.role, ou.joined_at,
    u.login, u.name, u.avatar_url
FROM organization_users ou
JOIN users u ON u.id = ou.user_id
WHERE ou.org_id = $1
ORDER BY ou.joined_at ASC;

-- name: GetUserCurrentOrg :one
-- Get user's current org id.
SELECT current_org_id FROM users WHERE id = $1;

-- name: GetOrgPendingInvites :many
-- Fetches all pending invites for an organization (used in the TeamView pending panel).
SELECT
    i.id, i.target_email, i.target_github_login, i.status, i.created_at,
    u.login AS inviter_login
FROM organization_invites i
JOIN users u ON u.id = i.inviter_id
WHERE i.org_id = $1 AND i.status = 'pending'
ORDER BY i.created_at DESC;

-- name: GetUserPendingInvitesByLogin :many
-- Fetches pending invites by GitHub login (fallback when user email is not stored).
SELECT
    i.id, i.org_id, i.target_email, i.status, i.created_at,
    o.login AS org_login, o.display_name AS org_display_name, o.avatar_url AS org_avatar_url,
    u.login AS inviter_login
FROM organization_invites i
JOIN organizations o ON o.id = i.org_id
JOIN users u ON u.id = i.inviter_id
WHERE i.target_github_login = $1 AND i.status = 'pending'
ORDER BY i.created_at DESC;

-- name: GetUserByLogin :one
-- Fetches a user by their GitHub login.
SELECT id, github_id, login, name, email, avatar_url, installation_id
FROM users
WHERE login = $1
LIMIT 1;

-- name: GetOrgMemberRole :one
-- Returns the role of a user in an organization, or pgx.ErrNoRows if not a member.
SELECT role FROM organization_users WHERE org_id = $1 AND user_id = $2;

-- name: UpdateOrganizationDisplayName :exec
-- Renames a workspace (updates display_name).
UPDATE organizations SET display_name = $1, updated_at = NOW() WHERE id = $2;

-- name: SoftDeleteOrganization :exec
-- Marks an organization inactive; preserves repos/PRs/findings for audit.
UPDATE organizations SET is_active = false, updated_at = NOW() WHERE id = $1;

-- name: UpdateOrganizationUserRole :exec
-- Changes a member's role within an organization.
UPDATE organization_users SET role = $1 WHERE org_id = $2 AND user_id = $3;

-- name: RemoveOrganizationUser :exec
-- Removes a user from an organization.
DELETE FROM organization_users WHERE org_id = $1 AND user_id = $2;

-- name: DeleteOrganizationInvite :exec
-- Revokes a pending invitation.
DELETE FROM organization_invites WHERE id = $1;

-- name: FindOrgByGitHubID :one
-- Finds an organization row by its GitHub numeric ID (used during repo sync to map repo owners).
SELECT id FROM organizations WHERE github_id = $1 LIMIT 1;

-- name: UpsertRepoForSync :one
-- Upserts a repository discovered during active GitHub App sync.
-- ON CONFLICT preserves organization_id to avoid reassigning ownership.
INSERT INTO repositories (github_id, organization_id, full_name, is_private, name, default_branch, is_active, analysis_enabled, total_prs_analyzed)
VALUES ($1, $2, $3, $4, split_part($3, '/', 2), 'main', true, true, 0)
ON CONFLICT (github_id) DO UPDATE SET full_name = EXCLUDED.full_name, is_private = EXCLUDED.is_private
RETURNING id;

-- name: LinkOrgRepository :exec
-- Links or unlinks a repository to a workspace. ON CONFLICT updates is_active in place.
INSERT INTO organization_repositories (org_id, repo_id, is_active)
VALUES ($1, $2, $3)
ON CONFLICT (org_id, repo_id) DO UPDATE SET is_active = EXCLUDED.is_active, linked_at = NOW();

-- name: GetOrgReposWithLinkStatus :many
-- Visibility contract:
--   A user sees a repo in the workspace repo list if EITHER:
--     (a) They personally synced it via the GitHub App installation endpoint
--         (recorded in organization_repository_syncs). This covers their own
--         repos regardless of whether they are currently linked or unlinked.
--     (b) The repo is currently linked (is_active = true) to this workspace AND
--         the user is an admin. Linked repos from team members are only visible
--         to admins, not other regular members.
--   This prevents a member from seeing another member's linked repos, but allows
--   admins to see and manage all linked repos.
SELECT r.id, r.github_id, r.name, r.full_name, r.is_private, r.is_active,
       r.avg_quality_score, r.total_prs_analyzed,
       orr.is_active AS is_linked
FROM organization_repositories orr
JOIN repositories r ON r.id = orr.repo_id
WHERE orr.org_id = $1
  AND (
    EXISTS (
      SELECT 1 FROM organization_repository_syncs s
      WHERE s.org_id = orr.org_id AND s.repo_id = orr.repo_id AND s.user_id = $2
    )
    OR (
      orr.is_active = true AND
      EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.org_id = $1 AND ou.user_id = $2 AND ou.role = 'admin'
      )
    )
  )
ORDER BY r.full_name ASC;

-- name: RegisterRepoSync :exec
-- Records that a user has synced a specific repo into a workspace via the
-- GitHub App installation endpoint. Idempotent — safe to call on every sync.
INSERT INTO organization_repository_syncs (org_id, repo_id, user_id)
VALUES ($1, $2, $3)
ON CONFLICT (org_id, repo_id, user_id) DO NOTHING;
