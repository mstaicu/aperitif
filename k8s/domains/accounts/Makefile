.DEFAULT_GOAL := help

DOMAIN ?= tma.com
PORT ?= 8443
SKAFFOLD_MODULES := accounts-postgres-dev,accounts-migrate-dev,accounts-api-dev,accounts-worker-dev

.PHONY: help check check-api check-database check-infra check-manifests check-skaffold check-worker smoke

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: check-api check-worker check-infra check-database ## Run cheap accounts-local checks before deploy.

check-api: ## Check the accounts API package.
	cd packages/api && npm ci
	cd packages/api && npm exec -- eslint .

check-worker: ## Check the accounts worker package.
	cd packages/worker && npm ci
	cd packages/worker && npm exec -- eslint .

check-infra: check-manifests check-skaffold ## Check accounts manifests and Skaffold modules.

check-manifests: ## Render accounts manifests.
	kubectl kustomize infra/postgres/overlays/dev >/dev/null
	kubectl kustomize infra/postgres/overlays/live >/dev/null
	kubectl kustomize infra/migrate/overlays/dev >/dev/null
	kubectl kustomize infra/migrate/overlays/live >/dev/null

check-skaffold: ## Verify accounts Skaffold modules.
	skaffold diagnose --yaml-only -m $(SKAFFOLD_MODULES) >/dev/null

check-database: ## Check accounts database migration package.
	@echo "accounts: no database upgrade checks configured yet"

smoke: ## Smoke the deployed accounts boundary through Traefik.
	curl -fkSs -o /dev/null --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/v1/accounts/docs/json"
	test "$$(curl -ksS -o /dev/null -w "%{http_code}" --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/v1/accounts")" = "401"
