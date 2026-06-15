.DEFAULT_GOAL := help

DOMAIN ?= tma.com
PORT ?= 443
.PHONY: help pre-deploy pre-deploy-api pre-deploy-infra pre-deploy-manifests pre-deploy-ui post-deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

pre-deploy: pre-deploy-api pre-deploy-ui pre-deploy-infra ## Validate identity before deploying it.

pre-deploy-api: ## Validate the identity API package before deploy.
	cd packages/api && npm ci
	cd packages/api && npm exec -- eslint .

pre-deploy-ui: ## Validate the identity UI package before deploy.
	cd packages/ui && npm ci
	cd packages/ui && npm run typecheck
	cd packages/ui && npm run build

pre-deploy-infra: pre-deploy-manifests ## Validate identity manifests before deploy.

pre-deploy-manifests: ## Render identity manifests before deploy.
	kubectl kustomize infra/postgres/overlays/ephemeral >/dev/null
	kubectl kustomize infra/postgres/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/migrate/overlays/ephemeral >/dev/null
	kubectl kustomize infra/migrate/overlays/prod-eu >/dev/null
	kubectl kustomize infra/cleanup/overlays/ephemeral >/dev/null
	kubectl kustomize infra/cleanup/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/api/overlays/ephemeral >/dev/null
	kubectl kustomize infra/api/overlays/prod-eu >/dev/null
	kubectl kustomize infra/ui/overlays/ephemeral >/dev/null
	kubectl kustomize infra/ui/overlays/prod-eu >/dev/null

post-deploy: ## Verify the deployed identity boundary through Traefik.
	curl -fkSs -o /dev/null --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/.well-known/jwks.json"
	curl -fkSs -o /dev/null --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/v1/identity/docs/json"
