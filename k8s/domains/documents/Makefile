.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Documents components and manifests.
	cd components/api && npm ci
	cd components/api && npm exec -- eslint .
	cd components/api && npm exec -- tsc -p jsconfig.json --noEmit
	cd components/worker && npm ci
	cd components/worker && npm exec -- eslint .
	cd components/worker && npm exec -- tsc -p jsconfig.json --noEmit
	cd components/ui && npm ci
	cd components/ui && npm run typecheck
	cd components/ui && npm run build
	kubectl kustomize infra/postgres/overlays/ephemeral >/dev/null
	kubectl kustomize infra/postgres/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec components/migrate/infra/overlays/ephemeral >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec components/api/infra/overlays/ephemeral >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec components/worker/infra/overlays/ephemeral >/dev/null
	kubectl kustomize components/ui/infra/overlays/ephemeral >/dev/null

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
