.PHONY: up down destroy status logs proto-gen go-lint py-lint test ci

# Directories
INFRA_DIR=infra
GO_GATEWAY_DIR=apps/api-gateway
PY_WORKER_DIR=apps/ai-worker
CONTRACTS_DIR=packages/contracts

# Infrastructure
up:
	docker compose -f $(INFRA_DIR)/docker-compose.yml up -d
	@echo "✅ Infrastructure started."

down:
	docker compose -f $(INFRA_DIR)/docker-compose.yml down

destroy:
	docker compose -f $(INFRA_DIR)/docker-compose.yml down -v --remove-orphans
	@echo "🗑️  All infrastructure and volumes destroyed."

status:
	docker compose -f $(INFRA_DIR)/docker-compose.yml ps

logs:
	docker compose -f $(INFRA_DIR)/docker-compose.yml logs -f --tail=50

# Protobuf
proto-gen:
	buf generate $(CONTRACTS_DIR)

# Linting
go-lint:
	cd $(GO_GATEWAY_DIR) && golangci-lint run ./...

py-lint:
	cd $(PY_WORKER_DIR) && ruff check .

# Testing
test:
	cd $(GO_GATEWAY_DIR) && go test ./...
	cd $(PY_WORKER_DIR) && pytest tests/

ci: go-lint py-lint test
	buf breaking $(CONTRACTS_DIR) --against "https://github.com/Asylann/sentra.git#branch=main,subdir=packages/contracts"
