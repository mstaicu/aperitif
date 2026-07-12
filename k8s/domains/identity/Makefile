.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Identity packages and manifests.
	cd packages/api && npm ci
	cd packages/api && npm exec -- eslint .
	cd packages/api && npm exec -- tsc -p jsconfig.json --noEmit
	cd packages/api && npm test
	cd packages/ui && npm ci
	cd packages/ui && npm run typecheck
	cd packages/ui && npm run build
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

migrate: ## Deploy the Identity database and run its migrations.
	skaffold run -m identity-postgres
	kubectl delete job -n identity migrate --ignore-not-found
	skaffold run --force -m identity-migrate
	kubectl wait -n identity --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identity job/migrate --all-containers=true; exit 1; }

deploy: migrate ## Deploy Identity once in the current cluster.
	skaffold run -m identity-api,identity-ui,identity-cleanup

dev: ## Start the Identity development loop.
	$(MAKE) migrate
	exec skaffold dev -m identity-api,identity-ui,identity-cleanup
