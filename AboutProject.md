Название пооекта: Sentra

### Data Flow (Жизненный цикл одного Pull Request)

1. Developer ➡️ Push: Разработчик отправляет код в GitHub.

2. GitHub ➡️ Webhook (Go): GitHub шлет POST-запрос на наш Go API Gateway.

3. Ingestion & Auth (Go): Go-сервер проверяет HMAC-подпись GitHub, отвечает 200 OK за 5мс (чтобы GitHub не отвалился по таймауту) и кидает сырой payload в Kafka.

4. Message Broker (Kafka): Задача ложится в PR Queue. Если воркеры заняты, задача безопасно ждет своей очереди.

5. AI Worker (FastAPI): Python-воркер читает топик. Через GitHub API запрашивает конкретный git diff для этого PR.

6. AI Processing (AWS Bedrock): Воркер формирует системный промпт (добавляя контекст, историю ошибок юзера из БД) и отправляет в Claude 3. Анализируются: *Security, Complexity, Architecture*.

7. Delivery (GitHub API): Получив ответ, Python-воркер публикует готовый комментарий в PR через эндпоинт GitHub.

8. Metrics (PostgreSQL): Воркер парсит найденные ошибки и сохраняет статистику (Quality Score, Technical Debt) в БД для дашборда React.



### Компоненты системы и Стек



#### 1. Go API Gateway (Шлюз)

* Роль: Прием тысяч вебхуков в секунду, базовая валидация, маршрутизация.

* Особенности: Легковесный, асинхронный, защищает внутреннюю инфраструктуру от DDoS-атак и спама вебхуками.



#### 2. Apache Kafka (Центральная нервная система)

* Топики: PR_Queue, Analysis_Queue, Notification_Queue.

* Отказоустойчивость: Реализованы Retry Queue (повторные попытки при падении AWS Bedrock) и Dead Letter Queue (DLQ) для сломанных задач.



#### 3. FastAPI Python Workers (ИИ-Движок)

* Роль: LLM-оркестрация, вычисление эмбеддингов, генерация резюме.

* Логика: Парсинг AST (Абстрактного синтаксического дерева), RAG-поиск по предыдущим PR, Risk Analysis.



#### 4. PostgreSQL (Реляционная база - 40+ таблиц)

Хранит сложную структуру платформы:

* Organizations, Teams, Developers.

* Repositories, Pull_Requests, Commits, Files.

* Reviews, Security_Findings, Policies, Metrics.

* Subscriptions, Billing, Audit_Logs.



#### 5. React Frontend (Дашборды)

* Роль: Управление платформой. GitHub-like UI для просмотра Diff'ов, Code Review Panel, графики технического долга (Technical Debt Dashboard), тепловые карты Pull Request (Heatmaps).



---



## 🛡 Ключевые возможности (Feature Set)

- [x] PR Review: Мгновенный разбор нового кода.

- [x] Security & Secrets Scan: Поиск уязвимостей и случайно забытых токенов/ключей.

- [x] Code Complexity Analysis: Оценка Big-O нотации.

- [x] AI Suggestions & Fixes: Готовые сниппеты кода для замены.

- [x] Merge Policies: Автоматическая блокировка PR, если оценка (Quality Score) ниже 80/100.

- [x] Repository Analytics: Сбор DORA-метрик.



## Roadmap

Phase,Duration,Focus
Phase 1: Polyglot Infrastructure,Weeks 1–2,"Monorepo scaffold, Docker Compose, Buf (Protobuf), Taskfile, Lefthook"
Phase 2: Data Layer & Contracts,Weeks 2–3,"PostgreSQL EDM schema (40+ tables), sqlc (Go), Alembic (Python), Redis"
Phase 3: The Ingestion Gateway,Weeks 3–4,"Go API Gateway, HMAC constant-time auth, Redis SETNX deduplication"
Phase 4: Transactional Outbox,Weeks 4–5,"Go Relay worker, SKIP LOCKED queries, Kafka Producer, Partition keys"
Phase 5: AI Worker Foundation,Weeks 5–6,"FastAPI Clean Architecture, Kafka Consumer, Async delegation pattern"
Phase 6: Diff Fetching & AST Engine,Weeks 6–7,"GitHub API pagination, Tree-sitter chunking, Token pruning, Entropy scanning"
Phase 7: Cognitive LLM Core,Weeks 7–8,"AWS Bedrock Converse API, Structured JSON output, RAG via pgvector, Prompt Caching"
Phase 8: Check Runs & DevSecOps,Weeks 8–9,"Quality Score math, Check Runs API patching, Merge Policy enforcement"
Phase 9: DORA Dashboard (React),Weeks 9–10,"dora_daily_rollup SQL background jobs, Anthropic-style React UI"
Phase 10: Enterprise Hardening,Week 11,"k6 Spike testing, Playwright E2E, CI/CD path-filtering, Final Polish"



## Detailed Phase Execution Plan
Phase 1: Polyglot Monorepo Scaffold & Local Infrastructure
Action: Establish the strict directory structure for a Go/Python polyglot monorepo and define global orchestration tools.

Tasks & Deliverables:

Taskfile.yml: Global task runner replacing Makefiles.

lefthook.yml: Cross-language Git hooks (Ruff for Python, golangci-lint for Go).

packages/contracts/: Define buf.yaml and buf.gen.yaml for Protobuf schema generation (PullRequestCreated event). Enforce WIRE_JSON breaking change rules.

apps/api-gateway/: Scaffold Go standard layout (cmd/, internal/).

apps/ai-worker/: Scaffold Python Clean Architecture layout (domain/, application/, infrastructure/, presentation/).

infra/docker-compose.yml: Wire up PostgreSQL 16 (with pgvector), Redis 7, Kafka + Zookeeper.

Key Decisions Documented:

Independent package managers (go.work for Go, pyproject.toml for Python) strictly separated.

No shared .env files; strict encapsulation per service.

Status: Phase 1 complete. Infrastructure boots via docker compose up -d.

Phase 2: Relational Data Layer & Database Orchestration
Action: Design and implement the 40+ table database schema as the single source of truth, utilizing different code-generation strategies for Go and Python.

Tasks & Deliverables:

packages/db-schema/schema.sql: Write the raw SQL schema (organizations, repositories, pull_requests, review_findings, security_suppression_rules, webhook_payloads, outbox_events).

apps/ai-worker/alembic/: Configure Alembic for Python to manage and apply migrations.

apps/api-gateway/sqlc.yaml: Configure sqlc for Go to generate type-safe, reflection-free DB models powered by pgx.

Redis implementation setup for caching and rate limiting.

Key Decisions Documented:

Python owns DB migrations due to complex RAG/Analytics logic.

Go uses sqlc strictly for high-speed, zero-reflection OLTP inserts.

Phase 3: High-Concurrency Go API Gateway (The Shield)
Action: Build the perimeter entry point capable of sub-5ms response times to satisfy GitHub's strict webhook delivery SLA and prevent retry storms.

Tasks & Deliverables:

api-gateway/internal/webhook/handler.go: HTTP endpoints using standard net/http or gin.

HMAC Verification: Implement timing-safe signature verification using crypto/subtle.ConstantTimeCompare before ANY JSON unmarshalling occurs.

Deduplication: Implement Redis SETNX logic using the X-GitHub-Delivery header with a 24-hour TTL.

The 202 Pattern: Enforce immediate HTTP 202 Accepted response upon saving to the database.

Key Decisions Documented:

Reading r.Body into a raw []byte block to prevent JSON serialization mismatches during HMAC verification.

Phase 4: Transactional Outbox & Reliable Messaging (Kafka)
Action: Solve the "Dual Write" problem. Guarantee that every webhook saved to PostgreSQL is published to Kafka exactly once, maintaining strict chronological order.

Tasks & Deliverables:

Outbox Insert: Update Go webhook handler to insert raw payload + Protobuf binary into outbox_events within the same ACID transaction as the webhook_payloads insert.

Relay Worker: Build a Go background goroutine polling outbox_events using SELECT ... FOR UPDATE SKIP LOCKED to safely scale across multiple gateway pods.

Kafka Producer: Implement Sarama async producer.

Partitioning: Route messages using the composite key: repository_id:pull_request_number to prevent race conditions between commits on the same PR.

Key Decisions Documented:

acks=all and enable.idempotence=true configured for the Kafka producer.

Phase 5: AI Worker Skeleton & Async Delegation (Python)
Action: Build the FastAPI worker that consumes Kafka events safely without triggering Kafka Coordinator timeouts during long AI inference tasks.

Tasks & Deliverables:

confluent-kafka integration in Python.

Async Delegation Pattern: The main Kafka thread calls poll() constantly to send heartbeats, offloading the actual PR processing payload to an asyncio.Queue or ThreadPoolExecutor.

Queue Topology: Configure routing for PR_Queue (Main), PR_Queue_Retry (Exponential Backoff), and PR_Queue_DLQ (Dead Letter Queue).

Tune configurations: Set max.poll.records=1 and max.poll.interval.ms=600000 (10 mins).

Key Decisions Documented:

Guarding against RebalanceInProgressException by decoupling polling from processing.

Phase 6: Code Processing, Diff Fetching & AST Isolation
Action: Build the Python pipeline to fetch code from GitHub, clean it, and prepare it for the LLM to drastically reduce token consumption (Context Pruning).

Tasks & Deliverables:

Diff Fetching: Implement HTTP clients calling /repos/{owner}/{repo}/pulls/{pull_number} with application/vnd.github.v3.diff.

Fallback Logic: Implement paginated /files fetching if the PR exceeds GitHub's 300-file or 100MB diff limits.

Sanitization: Strip lock files (go.sum, package-lock.json), minified JS, and SVG/image binaries (saves 40-90% tokens).

Tree-sitter Integration: Build the AST parser to isolate changed lines and extract ONLY the surrounding function/class definitions, discarding irrelevant code.

Key Decisions Documented:

Multi-stage context pruning is mandatory before touching the AWS Bedrock SDK.

Phase 7: Cognitive LLM Core & RAG Integration (AWS Bedrock)
Action: Integrate Claude 3 models via AWS Bedrock Converse API, enforcing strict structured outputs and leveraging Prompt Caching to slash costs and latency.

Tasks & Deliverables:

RAG Pipeline: Query pgvector for specific Developer Error History and Organization Code Policies.

Tool Use (Structured Output): Define the publish_code_review_findings JSON schema tool inside the Bedrock request to force Claude to output strictly typed JSON (file, line, severity, suggestion).

Prompt Caching: Structure the system prompt so SYSTEM_AND_TOOLS are cached at the top, and dynamic git diffs are appended at the bottom, drastically reducing Time to First Token (TTFT).

Prompt Injection Defense: Wrap diffs in strict <git_diff> XML tags.

Model Routing: Logic to route small PRs to Claude 3 Haiku, and complex algorithmic changes to Claude 3.5 Sonnet.

Key Decisions Documented:

Relying exclusively on Tool Use instead of string-based "Respond in JSON" prompts to avoid parsing crashes.

Phase 8: Security Analytics & GitHub Check Runs Integration
Action: Implement Level 1 deterministic scanning and manage the actual feedback loop to the developer inside the GitHub UI.

Tasks & Deliverables:

Deterministic Scans: Implement Shannon Entropy (H(X)>4.5) and Regex scanning in Python to catch hardcoded AWS keys before the LLM step.

Fingerprint Suppression: Implement SHA256 suppression logic for #sentra-ignore-line comments and dashboard UI overrides.

Quality Score Math: Implement the deduction formula (QS=100−∑w(s 
i
​
 )).

GitHub Checks API: Send POST to create in_progress check. Send PATCH to finalize completed check with conclusion success/failure/neutral.

Annotation Handling: Chunk annotations into batches of 50 to respect GitHub REST API limits.

Key Decisions Documented:

Blocking PR merges directly via GitHub Protected Branches if Quality Score < 80.

Phase 9: React DORA Dashboard & Anthropic-Style Frontend
Action: Build the executive analytics interface using modern frontend technologies and an ultra-premium, minimalist design language.

Tasks & Deliverables:

DORA Rollup (Backend): Write the PostgreSQL background cron scripts (INSERT INTO dora_daily_rollup SELECT ...) to pre-aggregate Deployment Frequency, Lead Time, and CFR.

Frontend Scaffold: Generate the React/Next.js frontend using Tailwind CSS. Note: We will parse the provided index.html layout from the Anthropic-style reference and convert it into modular React components.

UI Implementation: Build the Technical Debt Dashboard, PR status tracking, and Organization Leaderboards using muted colors, sophisticated typography, and recharts / D3.

Key Decisions Documented:

Dashboard must fetch from dora_daily_rollup for sub-5ms UI renders instead of joining raw commit tables.

Phase 10: Production Hardening, Load Testing & Polish
Action: Ensure the entire pipeline is indestructible under enterprise loads and polished for external evaluation.

Tasks & Deliverables:

Spike Load Testing: Write k6 scripts to simulate 500 concurrent GitHub webhooks bombarding the Go Gateway, verifying RabbitMQ/Kafka queue depths and zero 5xx errors.

Playwright E2E: Write automated browser tests logging into GitHub, opening a PR, and verifying the Sentra AI Check Run goes green/red.

CI/CD Orchestration: Finalize GitHub Actions using dorny/paths-filter to independently build/test Go and Python directories.

Final Documentation: Auto-generate Swagger/OpenAPI docs for the Go Gateway and FastAPI worker.

Status: Platform is production-ready, highly resilient, and ready for deployment to AWS.

How to Proceed
This roadmap sets the exact boundaries and architectural goals for Sentra.