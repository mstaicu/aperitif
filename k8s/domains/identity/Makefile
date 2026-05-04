.DEFAULT_GOAL := help

DOMAIN ?= tma.com
PORT ?= 8443
SKAFFOLD_MODULES := identity-postgres-dev,identity-migrate-dev,identity-api-dev,identity-ui-dev

.PHONY: help check check-api check-database check-infra check-manifests check-skaffold check-ui smoke

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: check-api check-ui check-infra check-database ## Run cheap identity-local checks before deploy.

check-api: ## Check the identity API package.
	cd packages/api && npm ci
	cd packages/api && npm exec -- eslint .

check-ui: ## Check the identity UI package.
	cd packages/ui && npm ci
	cd packages/ui && npm run typecheck
	cd packages/ui && npm run build

check-infra: check-manifests check-skaffold ## Check identity manifests and Skaffold modules.

check-manifests: ## Render identity manifests.
	kubectl kustomize infra/postgres/overlays/dev >/dev/null
	kubectl kustomize infra/postgres/overlays/live >/dev/null
	kubectl kustomize infra/migrate/overlays/dev >/dev/null
	kubectl kustomize infra/migrate/overlays/live >/dev/null
	kubectl kustomize infra/ui/overlays/dev >/dev/null
	kubectl kustomize infra/ui/overlays/live >/dev/null

check-skaffold: ## Verify identity Skaffold modules.
	skaffold diagnose --yaml-only -m $(SKAFFOLD_MODULES) >/dev/null

check-database: ## Check identity database migration package.
	@echo "identity: no database upgrade checks configured yet"

smoke: ## Smoke the deployed identity boundary through Traefik.
	curl -fkSs -o /dev/null --resolve "$(DOMAIN):$(PORT):127.0.0.1" "https://$(DOMAIN):$(PORT)/login"
	curl -fkSs -o /dev/null --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/.well-known/jwks.json"
	curl -fkSs -o /dev/null --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/v1/identity/docs/json"
