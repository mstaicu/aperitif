.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

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

deploy: migrate ## Deploy Documents once in the current cluster.
	skaffold run -m documents-api,documents-worker,documents-ui

dev: ## Start the Documents development loop.
	$(MAKE) migrate
	exec skaffold dev -m documents-api,documents-worker,documents-ui
