.DEFAULT_GOAL := help

DOMAIN ?= tma.com
PORT ?= 443
SKAFFOLD_MODULES := documents-postgres-dev,documents-migrate-dev,documents-api-dev,documents-worker-dev,documents-ui-dev

.PHONY: help pre-deploy pre-deploy-api pre-deploy-infra pre-deploy-manifests pre-deploy-skaffold pre-deploy-ui pre-deploy-worker post-deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

pre-deploy: pre-deploy-api pre-deploy-worker pre-deploy-ui pre-deploy-infra ## Validate documents before deploying it.

pre-deploy-api: ## Validate the documents API package before deploy.
	cd packages/api && npm ci
	cd packages/api && npm exec -- eslint .

pre-deploy-worker: ## Validate the documents worker package before deploy.
	cd packages/worker && npm ci
	cd packages/worker && npm exec -- eslint .

pre-deploy-ui: ## Validate the documents UI package before deploy.
	cd packages/ui && npm ci
	cd packages/ui && npm run typecheck
	cd packages/ui && npm run build

pre-deploy-infra: pre-deploy-manifests pre-deploy-skaffold ## Validate documents manifests and Skaffold modules before deploy.

pre-deploy-manifests: ## Render documents manifests before deploy.
	kubectl kustomize infra/postgres/overlays/dev >/dev/null
	kubectl kustomize infra/postgres/overlays/live >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/migrate/overlays/dev >/dev/null
	kubectl kustomize infra/migrate/overlays/live >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/api/overlays/dev >/dev/null
	kubectl kustomize infra/api/overlays/live >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/worker/overlays/dev >/dev/null
	kubectl kustomize infra/worker/overlays/live >/dev/null
	kubectl kustomize infra/ui/overlays/dev >/dev/null
	kubectl kustomize infra/ui/overlays/live >/dev/null

pre-deploy-skaffold: ## Verify documents Skaffold modules before deploy.
	skaffold diagnose --yaml-only -m $(SKAFFOLD_MODULES) >/dev/null

post-deploy: ## Verify the deployed documents boundary through Traefik.
	curl -fkSs -o /dev/null --resolve "$(DOMAIN):$(PORT):127.0.0.1" "https://$(DOMAIN):$(PORT)/documents"
	curl -fkSs -o /dev/null --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/v1/documents/docs/json"
	test "$$(curl -ksS -o /dev/null -w "%{http_code}" --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/v1/tenants/00000000-0000-4000-8000-000000000000/documents")" = "401"
	test "$$(curl -ksS -o /dev/null -w "%{http_code}" -X POST -H "content-type: application/json" -d '{"title":"Smoke"}' --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/v1/tenants/00000000-0000-4000-8000-000000000000/documents")" = "401"
