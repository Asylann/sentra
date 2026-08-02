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

