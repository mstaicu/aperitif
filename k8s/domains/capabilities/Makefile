.DEFAULT_GOAL := help

DOMAIN ?= tma.com
PORT ?= 443
.PHONY: help check check-api check-infra check-manifests check-worker smoke pre-deploy post-deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: check-api check-worker check-infra ## Validate capabilities.

check-api: ## Validate the capabilities API package.
	cd packages/api && npm ci
	cd packages/api && npm exec -- eslint .

check-worker: ## Validate the capabilities worker package.
	cd packages/worker && npm ci
	cd packages/worker && npm exec -- eslint .

check-infra: check-manifests ## Validate capabilities manifests.

check-manifests: ## Render capabilities manifests.
	kubectl kustomize infra/postgres/overlays/ephemeral >/dev/null
	kubectl kustomize infra/postgres/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/migrate/overlays/ephemeral >/dev/null
	kubectl kustomize infra/migrate/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/api/overlays/ephemeral >/dev/null
	kubectl kustomize infra/api/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/worker/overlays/ephemeral >/dev/null
	kubectl kustomize infra/worker/overlays/prod-eu >/dev/null

smoke: ## Verify the deployed capabilities boundary through Traefik.
	curl -fkSs -o /dev/null --resolve "api.$(DOMAIN):$(PORT):127.0.0.1" "https://api.$(DOMAIN):$(PORT)/v1/capabilities/docs/json"

pre-deploy: check

post-deploy: smoke
