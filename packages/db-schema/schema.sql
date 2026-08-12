-- =============================================================================
-- Sentra Platform — Master Database Schema
-- =============================================================================
-- PostgreSQL 16 + pgvector extension
-- Phase 2 (Part 1): Relational Schema & Vector DB Foundation
--
-- SINGLE SOURCE OF TRUTH for ALL services:
--   Go api-gateway   → sqlc reads this file to generate typed, zero-reflection queries
--   Python ai-worker → Alembic uses this as migration baseline (owns all ALTER TABLE ops)
--
-- ARCHITECTURAL PRINCIPLES:
--   1. Go uses sqlc for INSERT/SELECT on the hot webhook path (OLTP, no ORM).
--   2. Python owns ALL DDL changes: run `task py:migrate` to apply via Alembic.
--   3. Avoid polymorphic FKs — use nullable columns + CHECK constraints instead.
--   4. TIMESTAMPTZ everywhere: UTC is law, no naive timestamps.
--   5. BIGSERIAL for internal IDs; TEXT for GitHub-provided string IDs.
--   6. pgvector vector(1536) for text-embedding-3-small (OpenAI-compatible dims).
--      HNSW index used over IVFFlat: better recall, no training data required.
--
-- DOMAIN GROUPS (top-to-bottom, dependencies respected):
--   [1] Extensions
--   [2] Core Entities         — organizations, teams, developers, repositories
--   [3] Junction Tables       — org/team membership, team-repo mapping
--   [4] Configuration         — repository_policies, installation_tokens
--   [5] Ingestion Pipeline    — webhook_payloads, outbox_events
--   [6] Pull Request Domain   — pull_requests, commits, pr_files
--   [7] AI Analysis Layer     — review_findings, security_suppression_rules
--   [8] Developer RAG         — developer_embeddings, developer_repository_stats
--   [9] Audit & Billing       — audit_logs, subscription_plans, organization_subscriptions
--  [10] Analytics             — dora_daily_rollup
-- =============================================================================


-- =============================================================================
-- [1] EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4() for delivery IDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_bytes() for fingerprints
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector: HNSW index for RAG embeddings


-- =============================================================================
-- [2] CORE ENTITIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users
-- GitHub OAuth users who log into the Sentra SaaS dashboard.
-- Created/updated on every successful GitHub OAuth callback.
-- installation_id is NULL until the user installs the GitHub App.
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id                      BIGSERIAL       PRIMARY KEY,
    github_id               BIGINT          NOT NULL UNIQUE,
    login                   TEXT            NOT NULL UNIQUE,    -- GitHub username
    name                    TEXT,                               -- Display name (nullable)
    email                   TEXT,                               -- Primary email (may be null if hidden)
    avatar_url              TEXT,
    -- GitHub OAuth access token. In production: encrypt at rest.
    -- Used to make API calls on behalf of the user (check installations).
    github_access_token     TEXT,
    -- GitHub App installation ID for this user.
    -- NULL = user has not yet installed the GitHub App.
    -- Populated when the GitHub App installation webhook fires, or
    -- checked via GET /user/installations on each login.
    installation_id         BIGINT,
    -- Active organization context for multi-tenancy
    current_org_id          BIGINT          REFERENCES organizations(id) ON DELETE SET NULL,
    -- Timestamps
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_github_id   ON users(github_id);
CREATE INDEX idx_users_login       ON users(login);

COMMENT ON TABLE  users IS
    'Sentra SaaS users authenticated via GitHub OAuth. installation_id is NULL until the user installs the GitHub App on at least one repository.';
COMMENT ON COLUMN users.installation_id IS
    'GitHub App Installation ID for this user. NULL = App not yet installed. Used to associate incoming webhook events with a specific dashboard user.';


-- -----------------------------------------------------------------------------
-- organizations
-- Represents a GitHub Organization or user account with a Sentra installation.
-- One installation_id → one organization (enforced by UNIQUE constraint).
-- -----------------------------------------------------------------------------
CREATE TABLE organizations (
    id                      BIGSERIAL       PRIMARY KEY,
    github_id               BIGINT          NOT NULL UNIQUE,
    login                   TEXT            NOT NULL UNIQUE,    -- e.g. "acme-corp"
    display_name            TEXT,                               -- GitHub display_name (nullable)
    avatar_url              TEXT,
    type                    TEXT            NOT NULL DEFAULT 'Organization',  -- Organization | User
    -- GitHub App installation
    installation_id         BIGINT          NOT NULL UNIQUE,    -- X-GitHub-Installation-Id
    -- Access control
    plan_tier               TEXT            NOT NULL DEFAULT 'free',  -- free | pro | enterprise
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    -- B2B workspace type (personal = individual user workspace, company = team workspace)
    workspace_type          TEXT            NOT NULL DEFAULT 'company',
    -- Quality gate defaults (overridable per repository via repository_policies)
    quality_gate_threshold  INT             NOT NULL DEFAULT 80
        CONSTRAINT chk_orgs_qs_threshold CHECK (quality_gate_threshold BETWEEN 0 AND 100),
    -- Timestamps
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_orgs_plan CHECK (plan_tier IN ('free', 'pro', 'enterprise')),
    CONSTRAINT chk_orgs_type CHECK (type IN ('Organization', 'User')),
    CONSTRAINT chk_orgs_workspace_type CHECK (workspace_type IN ('personal', 'company'))
);

COMMENT ON TABLE  organizations IS
    'GitHub organizations/users with an active Sentra App installation.';
COMMENT ON COLUMN organizations.installation_id IS
    'GitHub App Installation ID — used to exchange a JWT for a short-lived installation token.';
COMMENT ON COLUMN organizations.quality_gate_threshold IS
    'Organization-wide default Quality Score threshold (0-100). PRs below this score '
    'receive conclusion=failure from the Check Runs API, blocking the Merge button. '
    'Overridable per repository in repository_policies.';


-- -----------------------------------------------------------------------------
-- teams
-- GitHub Teams within an organization. Used to scope policies and track team-level DORA metrics.
-- -----------------------------------------------------------------------------
CREATE TABLE teams (
    id              BIGSERIAL   PRIMARY KEY,
    github_id       BIGINT      NOT NULL,
    organization_id BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,    -- e.g. "Backend Engineers"
    slug            TEXT        NOT NULL,    -- e.g. "backend-engineers" (URL-safe)
    description     TEXT,
    privacy         TEXT        NOT NULL DEFAULT 'secret',  -- secret | closed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (organization_id, github_id),
    CONSTRAINT chk_teams_privacy CHECK (privacy IN ('secret', 'closed'))
);

COMMENT ON TABLE teams IS
    'GitHub Teams within an organization. Policies and DORA metrics can be scoped to a team.';


-- -----------------------------------------------------------------------------
-- developers
-- Individual GitHub users who have authored PRs in monitored repositories.
-- Contains an expertise_vector embedding computed from their review history
-- and used by the RAG pipeline to personalize AI analysis.
-- -----------------------------------------------------------------------------
CREATE TABLE developers (
    id                  BIGSERIAL   PRIMARY KEY,
    github_id           BIGINT      NOT NULL UNIQUE,
    login               TEXT        NOT NULL UNIQUE,    -- GitHub username
    display_name        TEXT,
    avatar_url          TEXT,
    email               TEXT,
    -- expertise_vector: embedding over the developer's past findings + PR titles.
    -- Used by the RAG engine to retrieve relevant error history for personalized prompts.
    -- dim=1536 matches text-embedding-3-small (AWS Bedrock Titan Embeddings compatible).
    expertise_vector    vector(1536),
    -- Denormalized counters for leaderboard queries (updated via DORA rollup jobs)
    total_prs           INT         NOT NULL DEFAULT 0,
    total_findings      INT         NOT NULL DEFAULT 0,
    avg_quality_score   REAL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  developers IS
    'GitHub users who interact with monitored repositories. '
    'The expertise_vector powers the RAG pipeline for personalized AI code reviews.';
COMMENT ON COLUMN developers.expertise_vector IS
    'Aggregated embedding (1536-dim) over the developer''s past PR titles, finding descriptions, '
    'and fix suggestions. Enables the RAG query: "find similar past errors by this author" '
    'to inject into the system prompt before LLM inference.';


-- -----------------------------------------------------------------------------
-- repositories
-- GitHub repositories monitored by Sentra.
-- Belongs to one organization; has one set of repository_policies.
-- -----------------------------------------------------------------------------
CREATE TABLE repositories (
    id                  BIGSERIAL   PRIMARY KEY,
    github_id           BIGINT      NOT NULL UNIQUE,
    organization_id     BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                TEXT        NOT NULL,           -- e.g. "sentra-api"
    full_name           TEXT        NOT NULL UNIQUE,    -- e.g. "acme-corp/sentra-api"
    description         TEXT,
    default_branch      TEXT        NOT NULL DEFAULT 'main',
    primary_language    TEXT,                           -- GitHub-detected language
    is_private          BOOLEAN     NOT NULL DEFAULT TRUE,
    -- Sentra-specific control flags
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    analysis_enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
    -- Cached stats (updated after each analysis)
    avg_quality_score   REAL,
    total_prs_analyzed  INT         NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  repositories IS
    'GitHub repositories that have Sentra analysis enabled.';
COMMENT ON COLUMN repositories.full_name IS
    'Composite GitHub identifier "{owner}/{repo}" — unique across all of GitHub. '
    'Used as the primary reference in GitHub API calls.';
COMMENT ON COLUMN repositories.is_active IS
    'When FALSE, webhook events are accepted but immediately dropped after the 202 response. '
    'Allows pausing analysis without removing the GitHub App installation.';


-- =============================================================================
-- [3] JUNCTION TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- organization_members
-- Many-to-many: developers who belong to an organization.
-- Populated by GitHub App membership webhooks.
-- -----------------------------------------------------------------------------
CREATE TABLE organization_members (
    organization_id BIGINT  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    developer_id    BIGINT  NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    role            TEXT    NOT NULL DEFAULT 'member',  -- member | admin | billing_manager
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (organization_id, developer_id),
    CONSTRAINT chk_org_member_role CHECK (role IN ('member', 'admin', 'billing_manager'))
);


-- -----------------------------------------------------------------------------
-- organization_users
-- Many-to-many: dashboard users (not developers) who belong to an organization.
-- Powers B2B multi-tenancy: users can be members of multiple organizations.
-- -----------------------------------------------------------------------------
CREATE TABLE organization_users (
    org_id          BIGINT  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         BIGINT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT    NOT NULL DEFAULT 'member',  -- admin | member
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (org_id, user_id),
    CONSTRAINT chk_org_users_role CHECK (role IN ('admin', 'member'))
);


-- -----------------------------------------------------------------------------
-- organization_invites
-- Pending invitations to join an organization workspace.
-- One active invite per email per organization (UNIQUE constraint).
-- -----------------------------------------------------------------------------
CREATE TABLE organization_invites (
    id              BIGSERIAL   PRIMARY KEY,
    org_id          BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    inviter_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_email    TEXT        NOT NULL,
    target_github_login TEXT,
    status          TEXT        NOT NULL DEFAULT 'pending',  -- pending | accepted | declined
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (org_id, target_email),
    CONSTRAINT chk_org_invites_status CHECK (status IN ('pending', 'accepted', 'declined'))
);


-- -----------------------------------------------------------------------------
-- organization_repositories
-- Explicit workspace-to-repository mapping. Populated by the active sync
-- endpoint (GitHub API call) and installation webhook events. Controls which
-- repos feed a workspace's PRs, leaderboard, and metrics.
-- is_active = true  → this workspace tracks this repo
-- is_active = false → repo was synced but user chose not to include it
-- -----------------------------------------------------------------------------
CREATE TABLE organization_repositories (
    org_id      BIGINT  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    repo_id     BIGINT  NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    linked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (org_id, repo_id)
);
CREATE INDEX idx_org_repos_org ON organization_repositories(org_id) WHERE is_active = TRUE;

COMMENT ON TABLE organization_repositories IS
    'Workspace-to-repository mapping. Admins select which repos feed a workspace''s metrics.';


-- -----------------------------------------------------------------------------
-- team_members
-- Many-to-many: developers within a team.
-- Populated by GitHub Team membership webhooks.
-- -----------------------------------------------------------------------------
CREATE TABLE team_members (
    team_id         BIGINT  NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    developer_id    BIGINT  NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    role            TEXT    NOT NULL DEFAULT 'member',  -- member | maintainer
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (team_id, developer_id),
    CONSTRAINT chk_team_member_role CHECK (role IN ('member', 'maintainer'))
);


-- -----------------------------------------------------------------------------
-- team_repositories
-- Many-to-many: repositories managed by a team.
-- Used to aggregate DORA metrics at team level.
-- -----------------------------------------------------------------------------
CREATE TABLE team_repositories (
    team_id         BIGINT  NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    repository_id   BIGINT  NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    permission      TEXT    NOT NULL DEFAULT 'push',   -- pull | push | admin | maintain | triage

    PRIMARY KEY (team_id, repository_id),
    CONSTRAINT chk_team_repo_perm CHECK (permission IN ('pull', 'push', 'admin', 'maintain', 'triage'))
);


-- =============================================================================
-- [4] CONFIGURATION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- repository_policies
-- Per-repository (or per-organization fallback) analysis configuration.
-- The AI Worker reads this to customize the system prompt and quality gate logic.
-- NULL repository_id = org-wide policy (lower precedence than repo-specific).
-- -----------------------------------------------------------------------------
CREATE TABLE repository_policies (
    id                      BIGSERIAL   PRIMARY KEY,
    -- Scope: repo-level OR org-level (not both, not neither)
    repository_id           BIGINT      REFERENCES repositories(id) ON DELETE CASCADE,
    organization_id         BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- Quality gate override
    quality_gate_threshold  INT         NOT NULL DEFAULT 80
        CONSTRAINT chk_policy_qs CHECK (quality_gate_threshold BETWEEN 0 AND 100),
    block_on_critical       BOOLEAN     NOT NULL DEFAULT TRUE,
    -- Which analysis axes are active (subset of all 4 categories)
    enabled_categories      TEXT[]      NOT NULL DEFAULT ARRAY['Security', 'Complexity', 'Architecture', 'Style'],
    -- File path globs to skip (e.g. 'tests/**', 'vendor/**')
    ignore_paths            TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    -- Custom org rules injected into the LLM system prompt <organization_rules> XML tag
    custom_rules_text       TEXT,
    -- Maximum findings to surface per PR (avoids annotation spam)
    max_findings_per_pr     INT         NOT NULL DEFAULT 50
        CONSTRAINT chk_policy_max_findings CHECK (max_findings_per_pr BETWEEN 1 AND 200),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure at least one scope is set
    CONSTRAINT chk_policy_scope CHECK (
        repository_id IS NOT NULL OR organization_id IS NOT NULL
    ),
    -- At most one policy per repository
    UNIQUE NULLS NOT DISTINCT (repository_id, organization_id)
);

COMMENT ON TABLE  repository_policies IS
    'Configures analysis behavior per repository or organization. '
    'Repo-level policies take precedence over org-level policies.';
COMMENT ON COLUMN repository_policies.custom_rules_text IS
    'Free-text rules injected verbatim into the <organization_rules> XML tag in the '
    'LLM system prompt. Example: "Never approve use of eval() in production paths."';
COMMENT ON COLUMN repository_policies.ignore_paths IS
    'Glob patterns for files to exclude from analysis entirely. '
    'Example: {''tests/**'', ''vendor/**'', ''*.generated.go''}';


-- -----------------------------------------------------------------------------
-- installation_tokens
-- Cached GitHub App installation tokens.
-- GitHub App tokens expire in ~1 hour; caching prevents rate limit exhaustion
-- on the token endpoint, especially during high-throughput PR storms.
-- Research2 §3.3: Redis caches hot tokens; this table is the persistent fallback.
-- -----------------------------------------------------------------------------
CREATE TABLE installation_tokens (
    id              BIGSERIAL   PRIMARY KEY,
    installation_id BIGINT      NOT NULL UNIQUE
                                REFERENCES organizations(installation_id)
                                ON DELETE CASCADE,
    -- In production: encrypt with pgcrypto symmetric key stored in KMS.
    -- For development: stored in plaintext (acceptable in isolated VPC).
    token_encrypted TEXT        NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  installation_tokens IS
    'GitHub App installation token cache. Redis is the primary cache; '
    'this table provides a warm-restart fallback when Redis is flushed.';
COMMENT ON COLUMN installation_tokens.token_encrypted IS
    'GitHub Installation token. In production, encrypted with pgcrypto using a '
    'KMS-managed symmetric key before INSERT.';


-- =============================================================================
-- [5] INGESTION PIPELINE (Transactional Outbox)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- webhook_payloads
-- Raw, immutable record of every GitHub webhook received.
-- Written by Go API Gateway BEFORE returning 202 Accepted.
-- Part 1 of 2 of the Transactional Outbox ACID transaction.
-- (Part 2 is outbox_events, always written in the same transaction.)
-- Research3 §"HMAC Verification": body is stored AFTER signature validation.
-- -----------------------------------------------------------------------------
CREATE TABLE webhook_payloads (
    id              BIGSERIAL   PRIMARY KEY,
    delivery_id     UUID        NOT NULL UNIQUE,    -- X-GitHub-Delivery header (UUIDv4)
    event_type      TEXT        NOT NULL,           -- X-GitHub-Event (pull_request, push, ...)
    action          TEXT,                           -- event action (opened, synchronize, closed)
    installation_id BIGINT      NOT NULL,
    organization_id BIGINT      REFERENCES organizations(id) ON DELETE SET NULL,
    repository_id   BIGINT      REFERENCES repositories(id) ON DELETE SET NULL,
    sender_login    TEXT,                           -- GitHub user who triggered the event
    -- Raw decoded body stored as JSONB for flexible querying and replay capability.
    -- GIN index allows fast filtering: payload @> '{"action":"opened"}'
    payload         JSONB       NOT NULL,
    signature_valid BOOLEAN     NOT NULL DEFAULT TRUE,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ                     -- NULL until the relay worker publishes it
);

COMMENT ON TABLE  webhook_payloads IS
    'Immutable audit log of all incoming GitHub webhooks. '
    'Enables full event replay without contacting GitHub''s re-delivery API. '
    'Part 1 of the Transactional Outbox — always written with outbox_events in one ACID tx.';
COMMENT ON COLUMN webhook_payloads.delivery_id IS
    'X-GitHub-Delivery UUID. Used as the Redis SETNX key for deduplication '
    '(TTL = 86400s). If this UUID is already in Redis, the event is a duplicate and is dropped.';
COMMENT ON COLUMN webhook_payloads.payload IS
    'Full decoded JSON body of the webhook. GIN-indexed for fast ad-hoc queries. '
    'Stored here to enable replay: if the Kafka topic is corrupted or retention expires, '
    'the outbox relay can re-publish from these raw payloads.';


-- -----------------------------------------------------------------------------
-- outbox_events
-- Pending messages to be relayed from PostgreSQL to Kafka.
-- Part 2 of the Transactional Outbox ACID transaction.
-- Go Relay Worker polls this with SELECT ... FOR UPDATE SKIP LOCKED.
-- Research1 §2.3, Research2 §3.2: Transactional Outbox pattern.
-- -----------------------------------------------------------------------------
CREATE TABLE outbox_events (
    id              BIGSERIAL   PRIMARY KEY,
    -- Composite business key used as Kafka partition key.
    -- Format: "{repository_id}:{pull_request_number}"
    -- Guarantees all events for the same PR land in the same Kafka partition,
    -- enforcing strict chronological ordering. Research3 §"Partition Key Strategy".
    aggregate_id    TEXT        NOT NULL,
    event_type      TEXT        NOT NULL,           -- e.g. "PullRequestCreated"
    kafka_topic     TEXT        NOT NULL,           -- e.g. "sentra.pr.queue"
    -- Binary Protobuf payload (PullRequestCreated message from events.proto).
    -- Stored as BYTEA for exact byte-for-byte fidelity; no JSON re-serialization risk.
    payload_proto   BYTEA       NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'pending',  -- pending | published | failed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ,
    retry_count     INT         NOT NULL DEFAULT 0,
    last_error      TEXT,                           -- last relay error message for debugging

    CONSTRAINT chk_outbox_status CHECK (status IN ('pending', 'published', 'failed'))
);

COMMENT ON TABLE  outbox_events IS
    'Transactional Outbox: guarantees at-least-once delivery from PostgreSQL to Kafka without '
    '2-Phase Commit. The Go Relay Worker uses SELECT ... FOR UPDATE SKIP LOCKED to safely poll '
    'this table across multiple horizontally-scaled gateway pods.';
COMMENT ON COLUMN outbox_events.aggregate_id IS
    'Kafka partition key: "{repository_id}:{pull_request_number}". '
    'Kafka murmur2 hash of this key maps every event for a given PR to the SAME partition, '
    'ensuring the Python AI Worker processes them in strict chronological order.';
COMMENT ON COLUMN outbox_events.payload_proto IS
    'Binary Protobuf bytes. Schema defined in packages/contracts/proto/sentra/v1/events.proto. '
    'Never re-serialize to JSON before publishing — byte-level fidelity is required for '
    'HMAC integrity and schema registry compatibility.';


-- =============================================================================
-- [6] PULL REQUEST DOMAIN
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pull_requests
-- The central business entity. One row per PR per analysis cycle.
-- The composite (repository_id, pull_number) is the business key.
-- quality_score: NULL until analysis completes; 0-100 after.
-- -----------------------------------------------------------------------------
CREATE TABLE pull_requests (
    id                      BIGSERIAL   PRIMARY KEY,
    github_pr_id            BIGINT      NOT NULL,
    repository_id           BIGINT      NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    organization_id         BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pull_number             INT         NOT NULL,
    title                   TEXT        NOT NULL,
    body                    TEXT,
    -- Author
    author_id               BIGINT      REFERENCES developers(id) ON DELETE SET NULL,
    author_login            TEXT        NOT NULL,
    -- Branch info
    base_branch             TEXT        NOT NULL,
    head_branch             TEXT        NOT NULL,
    head_sha                TEXT        NOT NULL,   -- current HEAD commit SHA
    base_sha                TEXT        NOT NULL,   -- merge base SHA
    -- PR state
    state                   TEXT        NOT NULL DEFAULT 'open',
    is_draft                BOOLEAN     NOT NULL DEFAULT FALSE,
    merged_at               TIMESTAMPTZ,
    closed_at               TIMESTAMPTZ,
    -- Analysis pipeline state
    analysis_status         TEXT        NOT NULL DEFAULT 'pending',
    -- quality_score: NULL = not yet analyzed, 0-100 = final score.
    -- CRITICAL: score < 80 OR any CRITICAL finding → conclusion="failure" → merge blocked.
    -- Score formula: QS = 100 - Σ w(sᵢ); weights: CRITICAL=25, HIGH=15, MEDIUM=5, LOW=1.
    quality_score           INT
        CONSTRAINT chk_pr_quality_score CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 100),
    merge_blocked           BOOLEAN     NOT NULL DEFAULT FALSE,
    -- GitHub Check Run tracking
    check_run_id            BIGINT,                 -- GitHub-assigned Check Run ID
    check_run_url           TEXT,                   -- URL in GitHub UI
    check_run_conclusion    TEXT,                   -- success | failure | neutral | skipped
    -- Timing
    analysis_started_at     TIMESTAMPTZ,
    analysis_completed_at   TIMESTAMPTZ,
    analysis_duration_ms    INT,                    -- denormalized for fast percentile queries
    -- Size metrics (from GitHub API)
    additions               INT         NOT NULL DEFAULT 0,
    deletions               INT         NOT NULL DEFAULT 0,
    changed_files           INT         NOT NULL DEFAULT 0,
    -- Finding summary (denormalized for fast dashboard queries — avoid joining review_findings)
    findings_critical       INT         NOT NULL DEFAULT 0,
    findings_high           INT         NOT NULL DEFAULT 0,
    findings_medium         INT         NOT NULL DEFAULT 0,
    findings_low            INT         NOT NULL DEFAULT 0,
    findings_info           INT         NOT NULL DEFAULT 0,
    -- AI model used (for cost tracking and A/B comparison)
    model_id                TEXT,                   -- e.g. "claude-3-5-sonnet-20240620"
    total_input_tokens      INT,
    total_output_tokens     INT,
    -- Timestamps
    github_created_at       TIMESTAMPTZ,
    github_updated_at       TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (repository_id, pull_number),
    CONSTRAINT chk_pr_state           CHECK (state IN ('open', 'closed', 'merged')),
    CONSTRAINT chk_pr_analysis_status CHECK (analysis_status IN (
        'pending', 'queued', 'in_progress', 'completed', 'failed', 'skipped'
    )),
    CONSTRAINT chk_pr_conclusion      CHECK (check_run_conclusion IS NULL OR check_run_conclusion IN (
        'success', 'failure', 'neutral', 'skipped', 'timed_out', 'action_required'
    ))
);

COMMENT ON TABLE  pull_requests IS
    'Central business entity. One row per GitHub Pull Request.';
COMMENT ON COLUMN pull_requests.quality_score IS
    'Final Quality Score (0-100). Computed as QS = 100 - Σ w(sᵢ) where w(CRITICAL)=25, '
    'w(HIGH)=15, w(MEDIUM)=5, w(LOW)=1, w(INFO)=0. Clamped to 0 minimum. '
    'NULL until analysis_status = ''completed''.';
COMMENT ON COLUMN pull_requests.merge_blocked IS
    'TRUE when check_run_conclusion = ''failure''. This denormalized flag enables fast '
    'dashboard queries like "show me all blocked PRs in the last 7 days" without joining.';
COMMENT ON COLUMN pull_requests.head_sha IS
    'The commit SHA at the HEAD of the PR branch at the time of analysis. '
    'Used as the Kafka partition key (with pull_number) and as the GitHub Check Run ''head_sha''.';
COMMENT ON COLUMN pull_requests.analysis_duration_ms IS
    'Wall-clock time from analysis_started_at to analysis_completed_at in milliseconds. '
    'Stored denormalized because EXTRACT(epoch) calculations on TIMESTAMPTZ in GROUP BY '
    'are expensive at dashboard query scale.';


-- -----------------------------------------------------------------------------
-- commits
-- Individual commits pushed to a PR. Populated from webhook "synchronize" events
-- and from the paginated GitHub Commits API when fetching the diff.
-- -----------------------------------------------------------------------------
CREATE TABLE commits (
    id              BIGSERIAL   PRIMARY KEY,
    sha             TEXT        NOT NULL,
    repository_id   BIGINT      NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    pull_request_id BIGINT      REFERENCES pull_requests(id) ON DELETE SET NULL,
    author_id       BIGINT      REFERENCES developers(id) ON DELETE SET NULL,
    author_login    TEXT        NOT NULL,
    committer_login TEXT,
    message         TEXT        NOT NULL,
    committed_at    TIMESTAMPTZ NOT NULL,
    additions       INT         NOT NULL DEFAULT 0,
    deletions       INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (repository_id, sha)
);

COMMENT ON TABLE commits IS
    'Individual commits associated with a pull request. '
    'Used for Lead Time calculation in DORA metrics (first_commit_at → merged_at).';


-- -----------------------------------------------------------------------------
-- pr_files
-- Individual files changed in a Pull Request.
-- Populated by the Python AI Worker after fetching the GitHub diff.
-- The patch column stores the raw unified diff for that file — used by the
-- AST engine and entropy scanner before LLM submission.
-- -----------------------------------------------------------------------------
CREATE TABLE pr_files (
    id                  BIGSERIAL   PRIMARY KEY,
    pull_request_id     BIGINT      NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    filename            TEXT        NOT NULL,
    status              TEXT        NOT NULL,   -- added | removed | modified | renamed | copied
    additions           INT         NOT NULL DEFAULT 0,
    deletions           INT         NOT NULL DEFAULT 0,
    -- Raw unified diff for this file (NULL for binary files).
    -- Stored here after pruning to enable retry without re-fetching from GitHub API.
    patch               TEXT,
    previous_filename   TEXT,                   -- populated when status = 'renamed'
    -- Whether this file was excluded from analysis (lock file, binary, etc.)
    was_excluded        BOOLEAN     NOT NULL DEFAULT FALSE,
    exclusion_reason    TEXT,                   -- 'lock_file' | 'binary' | 'generated' | 'ignored_path'

    UNIQUE (pull_request_id, filename),
    CONSTRAINT chk_file_status CHECK (status IN ('added', 'removed', 'modified', 'renamed', 'copied'))
);

COMMENT ON TABLE  pr_files IS
    'Files changed within a pull request, sourced from the GitHub Pulls API. '
    'Populated by the Python AI Worker during the diff-fetching stage.';
COMMENT ON COLUMN pr_files.patch IS
    'Raw unified diff for this file after Context Pruning (lock files stripped, '
    'git metadata headers removed). Stored to enable analysis retry without '
    're-fetching from the GitHub API (avoids hitting rate limits on retry).';


-- =============================================================================
-- [7] AI ANALYSIS LAYER
-- =============================================================================

-- -----------------------------------------------------------------------------
-- review_findings
-- Individual issues discovered by the AI analysis pipeline.
-- Each row is one actionable finding from either the LLM, entropy scanner,
-- AST engine, or regex detector.
-- The embedding column enables RAG: "find similar past findings by this author
-- in this repo" to inject as context into the next analysis prompt.
-- HNSW index: better query-time recall than IVFFlat, no training required.
-- -----------------------------------------------------------------------------
CREATE TABLE review_findings (
    id                  BIGSERIAL   PRIMARY KEY,
    pull_request_id     BIGINT      NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    repository_id       BIGINT      NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    organization_id     BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- Code location
    file_path           TEXT        NOT NULL,
    line_start          INT         NOT NULL,
    line_end            INT         NOT NULL,
    -- Classification (matches the LLM Tool Use JSON schema — Research4 §"Tool Use")
    category            TEXT        NOT NULL,
    severity            TEXT        NOT NULL,
    -- Content
    title               TEXT        NOT NULL,
    description         TEXT        NOT NULL,
    suggested_fix       TEXT,
    -- Additional diagnostic detail from the detector
    -- Examples: "Entropy: 4.85. Regex: AWS_SECRET_ACCESS_KEY matched"
    --           "AST Taint: user_input → string_concat → cursor.execute()"
    raw_details         TEXT,
    -- Suppression (Research5 §1.2: Persistent Fingerprint Suppression)
    -- fingerprint = SHA256(file_path || ':' || line_start || ':' || rule_id || ':' || code_snippet)
    fingerprint         TEXT        NOT NULL,
    is_suppressed       BOOLEAN     NOT NULL DEFAULT FALSE,
    suppressed_at       TIMESTAMPTZ,
    suppressed_by       BIGINT      REFERENCES developers(id) ON DELETE SET NULL,
    suppression_reason  TEXT,
    -- Quality Score contribution (denormalized from severity for fast SUM())
    -- CRITICAL=25, HIGH=15, MEDIUM=5, LOW=1, INFO=0
    score_weight        INT         NOT NULL DEFAULT 0
        CONSTRAINT chk_finding_weight CHECK (score_weight IN (0, 1, 5, 15, 25)),
    -- RAG embedding vector.
    -- Computed from: title + description + file_path (1536-dim).
    -- Queried via cosine distance: embedding <=> query_vector
    -- HNSW index (see below) provides ~10ms p99 query latency at 10M+ rows.
    embedding           vector(1536),
    -- Detector provenance
    detector_type       TEXT        NOT NULL DEFAULT 'llm',
    model_id            TEXT,                   -- e.g. "claude-3-5-sonnet-20240620"
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_finding_category CHECK (category IN ('Security', 'Complexity', 'Architecture', 'Style')),
    CONSTRAINT chk_finding_severity CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
    CONSTRAINT chk_finding_line     CHECK (line_end >= line_start),
    CONSTRAINT chk_finding_detector CHECK (detector_type IN ('llm', 'entropy', 'regex', 'ast', 'taint'))
);

COMMENT ON TABLE  review_findings IS
    'Individual actionable findings from AI analysis. Each row is one code issue '
    'with location, severity, suggested fix, and an optional embedding for RAG retrieval.';
COMMENT ON COLUMN review_findings.fingerprint IS
    'SHA256 hash of (file_path + line_start + rule_id + code_snippet). '
    'Used to match against security_suppression_rules. If a matching suppression rule '
    'exists, this finding is soft-deleted (is_suppressed=TRUE) and excluded from the '
    'Quality Score calculation and GitHub annotation batch.';
COMMENT ON COLUMN review_findings.score_weight IS
    'Denormalized penalty weight derived from severity. Stored directly to enable fast '
    'SUM(score_weight) GROUP BY pull_request_id without a CASE expression. '
    'Quality Score = 100 - SUM(score_weight) WHERE is_suppressed = FALSE.';
COMMENT ON COLUMN review_findings.embedding IS
    'Dense vector embedding (1536-dim) of the concatenated title + description + '
    'suggested_fix. Used by the RAG pipeline in the next analysis for the same '
    'developer/repository to retrieve similar historical findings as few-shot examples.';


-- -----------------------------------------------------------------------------
-- security_suppression_rules
-- Persistent fingerprint-based suppression for false positives.
-- When a developer marks a finding as "False Positive" in the React Dashboard,
-- a rule is inserted here. Future analysis runs check this table before surfacing
-- findings, preventing re-annotation of known-good code patterns.
-- Research5 §1.2: Persistent Fingerprint Suppression.
-- -----------------------------------------------------------------------------
CREATE TABLE security_suppression_rules (
    id                  BIGSERIAL   PRIMARY KEY,
    -- Scope: repo-level suppression takes precedence over org-level
    repository_id       BIGINT      REFERENCES repositories(id) ON DELETE CASCADE,
    organization_id     BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- fingerprint must match review_findings.fingerprint exactly
    fingerprint         TEXT        NOT NULL,
    reason              TEXT        NOT NULL,   -- false_positive | risk_accepted | known_issue | test_code
    -- Mirror the original finding classification for fast audit queries
    category            TEXT        NOT NULL,
    severity            TEXT        NOT NULL,
    suppressed_by       BIGINT      REFERENCES developers(id) ON DELETE SET NULL,
    -- Optional link back to the original finding that triggered this rule
    review_finding_id   BIGINT      REFERENCES review_findings(id) ON DELETE SET NULL,
    -- Optional expiry. NULL = permanent suppression.
    -- Use for "risk_accepted" suppressions that should be re-evaluated quarterly.
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One suppression per fingerprint per repository (org-level has NULL repository_id)
    UNIQUE NULLS NOT DISTINCT (fingerprint, repository_id),
    CONSTRAINT chk_suppression_reason   CHECK (reason   IN ('false_positive', 'risk_accepted', 'known_issue', 'test_code')),
    CONSTRAINT chk_suppression_category CHECK (category IN ('Security', 'Complexity', 'Architecture', 'Style')),
    CONSTRAINT chk_suppression_severity CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'))
);

COMMENT ON TABLE  security_suppression_rules IS
    'Persistent suppression rules keyed by finding fingerprint. '
    'Prevents re-annotating known false positives in future PR analyses.';
COMMENT ON COLUMN security_suppression_rules.fingerprint IS
    'Must exactly match the fingerprint on review_findings. '
    'Algorithm: encode(digest(file_path || '':'' || line_start || '':'' || code_snippet, ''sha256''), ''hex'')';
COMMENT ON COLUMN security_suppression_rules.expires_at IS
    'NULL = permanent suppression. Set a date for ''risk_accepted'' suppressions '
    'that should be re-evaluated. The dashboard shows a warning 30 days before expiry.';


-- =============================================================================
-- [8] DEVELOPER RAG & STATISTICS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- developer_repository_stats
-- Per-developer, per-repository aggregated statistics.
-- Populated by the DORA rollup background job.
-- Used to build the <developer_profile> XML tag injected into the LLM system prompt.
-- -----------------------------------------------------------------------------
CREATE TABLE developer_repository_stats (
    id                      BIGSERIAL   PRIMARY KEY,
    developer_id            BIGINT      NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    repository_id           BIGINT      NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    organization_id         BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- Cumulative stats
    total_prs               INT         NOT NULL DEFAULT 0,
    total_findings          INT         NOT NULL DEFAULT 0,
    findings_critical       INT         NOT NULL DEFAULT 0,
    findings_high           INT         NOT NULL DEFAULT 0,
    -- Averages
    avg_quality_score       REAL,
    avg_analysis_seconds    REAL,
    -- Recurring patterns (top 3 categories as text array for prompt injection)
    recurring_categories    TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    -- Timestamps
    first_pr_at             TIMESTAMPTZ,
    last_pr_at              TIMESTAMPTZ,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (developer_id, repository_id)
);

COMMENT ON TABLE  developer_repository_stats IS
    'Aggregated per-developer statistics for a repository. Used by the RAG pipeline '
    'to populate the <developer_profile> XML context in the LLM system prompt, '
    'enabling the model to say "this developer frequently introduces SQL injection issues".';
COMMENT ON COLUMN developer_repository_stats.recurring_categories IS
    'Top finding categories for this developer in this repo. '
    'Example: {''Security'', ''Complexity''}. Injected into the system prompt so the '
    'LLM focuses its analysis on the developer''s known weak areas.';


-- =============================================================================
-- [9] AUDIT & BILLING
-- =============================================================================

-- -----------------------------------------------------------------------------
-- audit_logs
-- Immutable append-only log of all significant platform actions.
-- Supports compliance requirements (SOC 2, ISO 27001).
-- Never UPDATE or DELETE rows in this table.
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id              BIGSERIAL   PRIMARY KEY,
    organization_id BIGINT      REFERENCES organizations(id) ON DELETE SET NULL,
    actor_id        BIGINT      REFERENCES developers(id) ON DELETE SET NULL,
    actor_login     TEXT,
    action          TEXT        NOT NULL,   -- e.g. "suppression.created", "policy.updated"
    resource_type   TEXT,                  -- e.g. "review_finding", "repository_policy"
    resource_id     BIGINT,
    metadata        JSONB       NOT NULL DEFAULT '{}'::JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS
    'Immutable event log for compliance and debugging. NEVER UPDATE or DELETE. '
    'GIN index on metadata enables fast audit queries: '
    'SELECT * FROM audit_logs WHERE metadata @> ''{"fingerprint":"abc123"}'';';


-- -----------------------------------------------------------------------------
-- subscription_plans
-- Immutable catalog of available Sentra subscription tiers.
-- Inserted once at bootstrap; referenced by organization_subscriptions.
-- -----------------------------------------------------------------------------
CREATE TABLE subscription_plans (
    id                      BIGSERIAL   PRIMARY KEY,
    name                    TEXT        NOT NULL UNIQUE,  -- free | pro | enterprise
    display_name            TEXT        NOT NULL,
    max_repositories        INT,        -- NULL = unlimited
    max_prs_per_month       INT,        -- NULL = unlimited
    max_developers          INT,        -- NULL = unlimited
    price_usd_per_month     NUMERIC(10, 2),
    features                JSONB       NOT NULL DEFAULT '{}'::JSONB,
    is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscription_plans IS
    'Catalog of available subscription tiers. Immutable except for plan-level feature toggles.';


-- -----------------------------------------------------------------------------
-- organization_subscriptions
-- Active subscription for each organization.
-- Only one active subscription per organization at a time.
-- -----------------------------------------------------------------------------
CREATE TABLE organization_subscriptions (
    id              BIGSERIAL   PRIMARY KEY,
    organization_id BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id         BIGINT      NOT NULL REFERENCES subscription_plans(id),
    status          TEXT        NOT NULL DEFAULT 'active',   -- active | past_due | canceled | trialing
    -- Billing period
    current_period_start    TIMESTAMPTZ NOT NULL,
    current_period_end      TIMESTAMPTZ NOT NULL,
    cancel_at               TIMESTAMPTZ,
    canceled_at             TIMESTAMPTZ,
    -- Usage tracking (reset at billing period start)
    prs_analyzed_this_period    INT NOT NULL DEFAULT 0,
    -- External billing system references
    stripe_subscription_id  TEXT UNIQUE,
    stripe_customer_id      TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_sub_status CHECK (status IN ('active', 'past_due', 'canceled', 'trialing'))
);

COMMENT ON TABLE organization_subscriptions IS
    'Tracks the active billing subscription for each organization.';


-- =============================================================================
-- [10] ANALYTICS — DORA METRICS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- dora_daily_rollup
-- Pre-aggregated DORA (DevOps Research and Assessment) metrics.
-- Populated by a daily PostgreSQL background job (pg_cron or Celery beat):
--   INSERT INTO dora_daily_rollup
--   SELECT ... FROM pull_requests JOIN commits ...
--   WHERE DATE(merged_at) = CURRENT_DATE - 1
--   ON CONFLICT (date, repository_id, organization_id) DO UPDATE ...
--
-- The React Dashboard reads ONLY from this table (never raw PR joins).
-- This enables sub-5ms dashboard queries at any organizational scale.
-- Research5 §9: "Dashboard must fetch from dora_daily_rollup for sub-5ms renders."
-- -----------------------------------------------------------------------------
CREATE TABLE dora_daily_rollup (
    id                      BIGSERIAL   PRIMARY KEY,
    date                    DATE        NOT NULL,
    -- Scope: repo-level row OR org-level aggregate row (repository_id IS NULL)
    repository_id           BIGINT      REFERENCES repositories(id) ON DELETE CASCADE,
    organization_id         BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- ---- DORA Metric 1: Deployment Frequency ----
    deployments_count       INT         NOT NULL DEFAULT 0,
    -- ---- DORA Metric 2: Lead Time for Changes (PR open → merge, in minutes) ----
    lead_time_p50_mins      REAL,       -- median
    lead_time_p95_mins      REAL,       -- 95th percentile
    lead_time_p99_mins      REAL,       -- 99th percentile (for SLA alerting)
    -- ---- DORA Metric 3: Change Failure Rate ----
    prs_merged              INT         NOT NULL DEFAULT 0,
    prs_reverted            INT         NOT NULL DEFAULT 0,  -- PRs that introduced a hotfix
    -- change_failure_rate = prs_reverted / NULLIF(prs_merged, 0)
    -- ---- DORA Metric 4: Mean Time to Restore ----
    mttr_p50_mins           REAL,
    mttr_p95_mins           REAL,
    -- ---- Sentra Quality Metrics ----
    avg_quality_score       REAL,
    min_quality_score       INT,
    max_quality_score       INT,
    -- PRs where merge_blocked = TRUE (quality gate triggered conclusion=failure)
    prs_blocked             INT         NOT NULL DEFAULT 0,
    prs_passed              INT         NOT NULL DEFAULT 0,
    -- Finding breakdown for trend charts
    findings_critical       INT         NOT NULL DEFAULT 0,
    findings_high           INT         NOT NULL DEFAULT 0,
    findings_medium         INT         NOT NULL DEFAULT 0,
    findings_low            INT         NOT NULL DEFAULT 0,
    findings_info           INT         NOT NULL DEFAULT 0,
    -- Total suppressed findings (for suppression rate trending)
    findings_suppressed     INT         NOT NULL DEFAULT 0,
    -- ---- AI Cost Metrics ----
    total_prs_analyzed      INT         NOT NULL DEFAULT 0,
    avg_analysis_ms         REAL,       -- average wall-clock analysis time in milliseconds
    total_input_tokens      BIGINT      NOT NULL DEFAULT 0,
    total_output_tokens     BIGINT      NOT NULL DEFAULT 0,
    -- Computed at rollup time
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One row per (date, repository, organization).
    -- NULLS NOT DISTINCT: org-level rows have NULL repository_id but are still unique per org+date.
    UNIQUE NULLS NOT DISTINCT (date, repository_id, organization_id)
);

COMMENT ON TABLE  dora_daily_rollup IS
    'Pre-aggregated DORA metrics. Populated nightly by a background job. '
    'The React Dashboard reads ONLY from this table — never raw PR/commit joins. '
    'This guarantees sub-5ms dashboard response times at any organizational scale.';
COMMENT ON COLUMN dora_daily_rollup.lead_time_p50_mins IS
    'Median Lead Time for Changes: time from first commit on the branch to PR merge, '
    'in minutes. The DORA elite benchmark is < 24 hours (< 1440 minutes).';
COMMENT ON COLUMN dora_daily_rollup.prs_reverted IS
    'Count of PRs merged on this date that were subsequently reverted within 48 hours. '
    'change_failure_rate = prs_reverted / NULLIF(prs_merged, 0). '
    'DORA elite benchmark: < 5%.';
COMMENT ON COLUMN dora_daily_rollup.repository_id IS
    'NULL for organization-level aggregate rows. Allows a single table to serve '
    'both per-repository and per-organization dashboard views.';


-- =============================================================================
-- INDEXES
-- =============================================================================
-- Naming convention: idx_{table}_{columns}[_{type}]
-- HNSW parameters: m=16, ef_construction=64 (tuned for recall@10 ≈ 0.99)
-- =============================================================================

-- ---- organizations ----------------------------------------------------------
CREATE INDEX idx_organizations_login        ON organizations(login);
CREATE INDEX idx_organizations_installation ON organizations(installation_id);

-- ---- organization_users -----------------------------------------------------
CREATE INDEX idx_org_users_user             ON organization_users(user_id);

-- ---- organization_invites ---------------------------------------------------
CREATE INDEX idx_org_invites_email          ON organization_invites(target_email);
CREATE INDEX idx_org_invites_status         ON organization_invites(org_id, status);

-- ---- repositories -----------------------------------------------------------
CREATE INDEX idx_repositories_org          ON repositories(organization_id);
CREATE INDEX idx_repositories_full_name    ON repositories(full_name);
CREATE INDEX idx_repositories_active       ON repositories(organization_id, is_active)
    WHERE is_active = TRUE;

-- ---- developers -------------------------------------------------------------
CREATE INDEX idx_developers_login          ON developers(login);
-- HNSW index for fast approximate nearest-neighbor search on expertise vectors.
-- Used by RAG pipeline: SELECT id FROM developers ORDER BY expertise_vector <=> $1 LIMIT 5
CREATE INDEX idx_developers_expertise_hnsw ON developers USING hnsw (expertise_vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ---- teams ------------------------------------------------------------------
CREATE INDEX idx_teams_org                 ON teams(organization_id);

-- ---- webhook_payloads -------------------------------------------------------
CREATE INDEX idx_webhook_payloads_delivery ON webhook_payloads(delivery_id);
CREATE INDEX idx_webhook_payloads_gin      ON webhook_payloads USING GIN(payload);
CREATE INDEX idx_webhook_payloads_org_type ON webhook_payloads(organization_id, event_type, received_at DESC);
CREATE INDEX idx_webhook_payloads_unprocessed ON webhook_payloads(received_at)
    WHERE processed_at IS NULL;

-- ---- outbox_events ----------------------------------------------------------
-- Partial index on pending events only: the relay worker's hot query path.
-- Research1 §2.3: SELECT ... FOR UPDATE SKIP LOCKED WHERE status = 'pending'
CREATE INDEX idx_outbox_events_pending     ON outbox_events(created_at ASC)
    WHERE status = 'pending';
CREATE INDEX idx_outbox_events_aggregate   ON outbox_events(aggregate_id);

-- ---- pull_requests ----------------------------------------------------------
CREATE INDEX idx_pr_repository             ON pull_requests(repository_id, pull_number);
CREATE INDEX idx_pr_author                 ON pull_requests(author_id);
CREATE INDEX idx_pr_status                 ON pull_requests(repository_id, analysis_status);
CREATE INDEX idx_pr_head_sha               ON pull_requests(head_sha);
CREATE INDEX idx_pr_merged_at              ON pull_requests(repository_id, merged_at DESC)
    WHERE merged_at IS NOT NULL;
-- Dashboard: "blocked PRs in last 7 days"
CREATE INDEX idx_pr_blocked                ON pull_requests(organization_id, merge_blocked, created_at DESC)
    WHERE merge_blocked = TRUE;

-- ---- commits ----------------------------------------------------------------
CREATE INDEX idx_commits_repository        ON commits(repository_id);
CREATE INDEX idx_commits_pr                ON commits(pull_request_id);
CREATE INDEX idx_commits_author            ON commits(author_id, committed_at DESC);

-- ---- pr_files ---------------------------------------------------------------
CREATE INDEX idx_pr_files_pr               ON pr_files(pull_request_id);
CREATE INDEX idx_pr_files_filename         ON pr_files(pull_request_id, filename);

-- ---- review_findings --------------------------------------------------------
CREATE INDEX idx_findings_pr               ON review_findings(pull_request_id);
CREATE INDEX idx_findings_repo_severity    ON review_findings(repository_id, severity, created_at DESC);
CREATE INDEX idx_findings_org_severity     ON review_findings(organization_id, severity)
    WHERE is_suppressed = FALSE;
CREATE INDEX idx_findings_fingerprint      ON review_findings(fingerprint);
-- HNSW index for finding similarity search (RAG: "retrieve similar findings for context injection")
-- Query: SELECT * FROM review_findings ORDER BY embedding <=> $query_vec LIMIT 10
CREATE INDEX idx_findings_embedding_hnsw   ON review_findings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ---- security_suppression_rules ---------------------------------------------
CREATE INDEX idx_suppression_fingerprint   ON security_suppression_rules(fingerprint);
CREATE INDEX idx_suppression_repo          ON security_suppression_rules(repository_id);
CREATE INDEX idx_suppression_org           ON security_suppression_rules(organization_id);
-- Fast lookup during analysis: does a suppression exist for this fingerprint?
CREATE INDEX idx_suppression_active        ON security_suppression_rules(fingerprint, repository_id)
    WHERE expires_at IS NULL OR expires_at > NOW();

-- ---- developer_repository_stats ---------------------------------------------
CREATE INDEX idx_devstats_developer        ON developer_repository_stats(developer_id);
CREATE INDEX idx_devstats_repository       ON developer_repository_stats(repository_id);

-- ---- audit_logs -------------------------------------------------------------
CREATE INDEX idx_audit_org_action          ON audit_logs(organization_id, action, created_at DESC);
CREATE INDEX idx_audit_actor               ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_metadata_gin        ON audit_logs USING GIN(metadata);

-- ---- dora_daily_rollup ------------------------------------------------------
CREATE INDEX idx_dora_date_org             ON dora_daily_rollup(organization_id, date DESC);
CREATE INDEX idx_dora_date_repo            ON dora_daily_rollup(repository_id, date DESC)
    WHERE repository_id IS NOT NULL;
-- Org-level aggregate rows (repository_id IS NULL)
CREATE INDEX idx_dora_org_aggregate        ON dora_daily_rollup(organization_id, date DESC)
    WHERE repository_id IS NULL;

-- ---- installation_tokens ----------------------------------------------------
CREATE INDEX idx_tokens_expires            ON installation_tokens(expires_at)
    WHERE expires_at > NOW();


-- =============================================================================
-- TABLE COMMENTS (summary level)
-- =============================================================================
COMMENT ON TABLE organization_members        IS 'M2M: developers belonging to an organization.';
COMMENT ON TABLE organization_users          IS 'M2M: dashboard users belonging to an organization (B2B multi-tenancy).';
COMMENT ON TABLE organization_invites        IS 'Pending invitations to join an organization workspace.';
COMMENT ON TABLE team_members                IS 'M2M: developers within a team.';
COMMENT ON TABLE team_repositories           IS 'M2M: repositories managed by a team.';
COMMENT ON TABLE repository_policies         IS 'Per-repo or org-level analysis configuration.';
COMMENT ON TABLE installation_tokens         IS 'Cached GitHub App installation tokens (1h TTL).';
COMMENT ON TABLE webhook_payloads            IS 'Immutable audit log of all received GitHub webhooks.';
COMMENT ON TABLE outbox_events               IS 'Transactional Outbox for at-least-once Kafka delivery.';
COMMENT ON TABLE pull_requests               IS 'Central entity: one row per analyzed GitHub PR.';
COMMENT ON TABLE commits                     IS 'Commits associated with pull requests.';
COMMENT ON TABLE pr_files                    IS 'Files changed within a pull request.';
COMMENT ON TABLE review_findings             IS 'Individual AI-discovered code issues with RAG embeddings.';
COMMENT ON TABLE security_suppression_rules  IS 'Persistent fingerprint suppressions for false positives.';
COMMENT ON TABLE developer_repository_stats  IS 'Aggregated developer stats per repository for RAG context.';
COMMENT ON TABLE audit_logs                  IS 'Immutable compliance audit trail — never UPDATE/DELETE.';
COMMENT ON TABLE subscription_plans          IS 'Billing plan catalog (free, pro, enterprise).';
COMMENT ON TABLE organization_subscriptions  IS 'Active subscription for each organization.';
COMMENT ON TABLE dora_daily_rollup           IS 'Pre-aggregated DORA metrics for sub-5ms dashboard queries.';
