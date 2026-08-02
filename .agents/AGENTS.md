# Sentra Platform — Workspace Agent Rules
# =========================================
# This file is auto-loaded by the AI coding assistant for every task in this workspace.
# It enforces mandatory behaviors for ALL agents working on the Sentra repository.
#
# FULL PROJECT DOCUMENTATION IS IN: /AGENTS.md
# Read it completely before making any changes.

## Mandatory Pre-Work Checklist

Before taking ANY action in this repository, you must:

1. **Read `AGENTS.md`** at the repository root — it contains the complete project reference, all architectural rules, and the changelog.
2. **Read `AboutProject.md`** for the detailed phase roadmap and engineering decisions.
3. **Check the current Phase** — look at the Roadmap table in AGENTS.md and confirm which phase is active.
4. **Review existing code** in the service you are about to modify before writing any new code.

## Mandatory Post-Work Rule

After completing ANY work that modifies files in this repository, you MUST:
- Append a changelog entry to the `## 📝 Changelog` section of `AGENTS.md`
- Use the exact format specified in the "Instructions for AI Agents" section of AGENTS.md
- Include: date, phase, files changed, summary, architectural decisions, next steps

## Key Rules Summary (Full rules in AGENTS.md)

- **Go `internal/`**: compiler-enforced encapsulation — no external imports
- **Python `domain/`**: ZERO external library dependencies — only stdlib
- **Kafka poll loop**: NEVER block it with LLM inference (Async Delegation Pattern)
- **HMAC verification**: always read raw `[]byte` BEFORE JSON parsing
- **Outbox pattern**: webhook_payloads + outbox_events in ONE ACID transaction
- **All DB migrations**: Python Alembic only — Go never creates/alters tables
- **LLM output**: Tool Use (Function Calling) only — never "respond in JSON" prompts
- **WIRE_JSON**: never rename/remove Protobuf fields — buf breaking will block it
- **Package naming**: never create `utils/`, `helpers/`, `common/` packages

## Services & Ports

| Service | Port | Tech |
|---|---|---|
| API Gateway | 8000 | Go 1.22 + Gin |
| AI Worker | 8001 | Python 3.12 + FastAPI |
| PostgreSQL | 5432 | PostgreSQL 16 + pgvector |
| Redis | 6379 | Redis 7 |
| Kafka | 9094 | Apache Kafka 3.7 |
| Kafka UI | 8080 | Provectus Kafka UI |
| pgAdmin | 5050 | pgAdmin 4 |

## Common Tasks

```bash
task infra:up          # Start local infrastructure
task proto:generate    # Regenerate Protobuf stubs
task go:lint           # Lint Go code
task py:lint           # Lint Python code
task py:test           # Run Python tests
task go:test           # Run Go tests
task ci                # Full CI suite
```
