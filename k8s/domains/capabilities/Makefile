.DEFAULT_GOAL := help

DOMAIN ?= tma.com
PORT ?= 443
.PHONY: help pre-deploy pre-deploy-api pre-deploy-infra pre-deploy-manifests pre-deploy-worker post-deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

pre-deploy: pre-deploy-api pre-deploy-worker pre-deploy-infra ## Validate capabilities before deploying it.

pre-deploy-api: ## Validate the capabilities API package before deploy.
	cd packages/api && npm ci
	cd packages/api && npm exec -- eslint .

pre-deploy-worker: ## Validate the capabilities worker package before deploy.
	cd packages/worker && npm ci
	cd packages/worker && npm exec -- eslint .

pre-deploy-infra: pre-deploy-manifests ## Validate capabilities manifests before deploy.

pre-deploy-manifests: ## Render capabilities manifests before deploy.
	kubectl kustomize infra/postgres/overlays/ephemeral >/dev/null
	kubectl kustomize infra/postgres/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/migrate/overlays/ephemeral >/dev/null
	kubectl kustomize infra/migrate/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/api/overlays/ephemeral >/dev/null
	kubectl kustomize infra/api/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/worker/overlays/ephemeral >/dev/null
	kubectl kustomize infra/worker/overlays/prod-eu >/dev/null

post-deploy: ## Verify the deployed capabilities boundary through Traefik.
	curl -fkSs -o /dev/null --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/v1/capabilities/docs/json"
