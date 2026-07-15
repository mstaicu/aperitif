.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev test

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Identity components, packages, and manifests.
	cd components/api && npm ci
	cd components/api && npm exec -- eslint .
	cd components/api && npm exec -- tsc -p jsconfig.json --noEmit
	cd components/api && npm test
	cd components/ui && npm ci
	cd components/ui && npm run typecheck
	cd components/ui && npm run build
	kubectl kustomize infra/postgres/overlays/ephemeral >/dev/null
	kubectl kustomize infra/postgres/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec components/migrations/infra/overlays/ephemeral >/dev/null
	kubectl kustomize components/migrations/infra/overlays/prod-eu >/dev/null
	kubectl kustomize infra/cleanup/overlays/ephemeral >/dev/null
	kubectl kustomize infra/cleanup/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec components/api/infra/overlays/ephemeral >/dev/null
	kubectl kustomize components/api/infra/overlays/prod-eu >/dev/null
	kubectl kustomize components/ui/infra/overlays/ephemeral >/dev/null
	kubectl kustomize components/ui/infra/overlays/prod-eu >/dev/null

migrate: ## Deploy the Identity database and run its migrations.
	skaffold run -m identity-postgres
	kubectl delete job -n identity migrations --ignore-not-found
	skaffold run --force -m identity-migrations
	kubectl wait -n identity --for=condition=complete --timeout=300s job/migrations || { kubectl logs -n identity job/migrations --all-containers=true; exit 1; }

deploy: migrate ## Deploy Identity once in the current cluster.
	skaffold run -m identity-api,identity-ui,identity-cleanup

dev: ## Start the Identity development loop.
	$(MAKE) migrate
	exec skaffold dev -m identity-api,identity-ui,identity-cleanup

test: ## Deploy Identity and its platform dependencies in a disposable cluster.
	$(MAKE) -C ../../platform/ingress deploy
	$(MAKE) -C ../../platform/event-bus deploy
	$(MAKE) deploy
	@: # Add domain integration tests here.
