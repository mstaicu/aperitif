.DEFAULT_GOAL := help

DOMAIN ?= tma.com
PORT ?= 443
SKAFFOLD_MODULES := tenancy-postgres-dev,tenancy-migrate-dev,tenancy-api-dev,tenancy-worker-dev

.PHONY: help pre-deploy pre-deploy-api pre-deploy-infra pre-deploy-manifests pre-deploy-skaffold pre-deploy-worker post-deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

pre-deploy: pre-deploy-api pre-deploy-worker pre-deploy-infra ## Validate tenancy before deploying it.

pre-deploy-api: ## Validate the tenancy API package before deploy.
	cd packages/api && npm ci
	cd packages/api && npm exec -- eslint .

pre-deploy-worker: ## Validate the tenancy worker package before deploy.
	cd packages/worker && npm ci
	cd packages/worker && npm exec -- eslint .

pre-deploy-infra: pre-deploy-manifests pre-deploy-skaffold ## Validate tenancy manifests and Skaffold modules before deploy.

pre-deploy-manifests: ## Render tenancy manifests before deploy.
	kubectl kustomize infra/postgres/overlays/dev >/dev/null
	kubectl kustomize infra/postgres/overlays/live >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/migrate/overlays/dev >/dev/null
	kubectl kustomize infra/migrate/overlays/live >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/api/overlays/dev >/dev/null
	kubectl kustomize infra/api/overlays/live >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/worker/overlays/dev >/dev/null
	kubectl kustomize infra/worker/overlays/live >/dev/null

pre-deploy-skaffold: ## Verify tenancy Skaffold modules before deploy.
	skaffold diagnose --yaml-only -m $(SKAFFOLD_MODULES) >/dev/null

post-deploy: ## Verify the deployed tenancy boundary through Traefik.
	curl -fkSs -o /dev/null --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/v1/tenants/docs/json"
	test "$$(curl -ksS -o /dev/null -w "%{http_code}" --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/v1/tenants")" = "401"
