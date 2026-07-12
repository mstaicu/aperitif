.DEFAULT_GOAL := help

PORT ?= 443

.PHONY: help check migrate deploy integration smoke

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Documents packages and manifests.
	cd packages/api && npm ci
	cd packages/api && npm exec -- eslint .
	cd packages/api && npm exec -- tsc -p jsconfig.json --noEmit
	cd packages/worker && npm ci
	cd packages/worker && npm exec -- eslint .
	cd packages/worker && npm exec -- tsc -p jsconfig.json --noEmit
	cd packages/ui && npm ci
	cd packages/ui && npm run typecheck
	cd packages/ui && npm run build
	kubectl kustomize infra/postgres/overlays/ephemeral >/dev/null
	kubectl kustomize infra/postgres/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/migrate/overlays/ephemeral >/dev/null
	kubectl kustomize infra/migrate/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/api/overlays/ephemeral >/dev/null
	kubectl kustomize infra/api/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/worker/overlays/ephemeral >/dev/null
	kubectl kustomize infra/worker/overlays/prod-eu >/dev/null
	kubectl kustomize infra/ui/overlays/ephemeral >/dev/null
	kubectl kustomize infra/ui/overlays/prod-eu >/dev/null

migrate: ## Deploy the Documents database and run its migrations.
	skaffold run -m documents-postgres
	kubectl delete job -n documents migrate --ignore-not-found
	skaffold run --force -m documents-migrate
	kubectl wait -n documents --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n documents job/migrate --all-containers=true; exit 1; }

deploy: migrate ## Deploy Documents to the current disposable cluster.
	skaffold run -m documents-api,documents-worker,documents-ui

integration: ## Deploy Documents and its integration dependencies.
	$(MAKE) -C ../.. deploy-platform
	$(MAKE) -C ../identity deploy
	$(MAKE) -C ../accounts deploy
	$(MAKE) -C ../entitlements deploy
	$(MAKE) deploy

smoke: ## Verify the deployed Documents boundary through Traefik.
	curl -fkSs -o /dev/null --resolve "api.tma.com:$(PORT):127.0.0.1" "https://api.tma.com:$(PORT)/v1/documents/docs/json"
