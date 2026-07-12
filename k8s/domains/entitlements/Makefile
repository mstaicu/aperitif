.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Entitlements packages and manifests.
	cd packages/api && npm ci
	cd packages/api && npm exec -- eslint .
	cd packages/api && npm exec -- tsc -p jsconfig.json --noEmit
	cd packages/api && npm test
	cd packages/contracts && npm ci
	cd packages/contracts && npm run build
	cd packages/worker && npm ci
	cd packages/worker && npm exec -- eslint .
	cd packages/worker && npm exec -- tsc -p jsconfig.json --noEmit
	cd packages/worker && npm test
	kubectl kustomize infra/postgres/overlays/ephemeral >/dev/null
	kubectl kustomize infra/postgres/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/migrate/overlays/ephemeral >/dev/null
	kubectl kustomize infra/migrate/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/api/overlays/ephemeral >/dev/null
	kubectl kustomize infra/api/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec infra/worker/overlays/ephemeral >/dev/null
	kubectl kustomize infra/worker/overlays/prod-eu >/dev/null

migrate: ## Deploy the Entitlements database and run its migrations.
	skaffold run -m entitlements-postgres
	kubectl delete job -n entitlements migrate --ignore-not-found
	skaffold run --force -m entitlements-migrate
	kubectl wait -n entitlements --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n entitlements job/migrate --all-containers=true; exit 1; }

deploy: migrate ## Deploy Entitlements once in the current cluster.
	skaffold run -m entitlements-api,entitlements-worker

dev: ## Start the Entitlements development loop.
	$(MAKE) migrate
	exec skaffold dev -m entitlements-api,entitlements-worker
