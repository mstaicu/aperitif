.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev test

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Documents components and manifests.
	cd components/api && npm ci
	cd components/api && npm exec -- eslint .
	cd components/api && npm exec -- tsc -p jsconfig.json --noEmit
	cd components/accounts-projector && npm ci
	cd components/accounts-projector && npm exec -- eslint .
	cd components/accounts-projector && npm exec -- tsc -p jsconfig.json --noEmit
	cd components/accounts-projector && npm test
	cd components/entitlements-projector && npm ci
	cd components/entitlements-projector && npm exec -- eslint .
	cd components/entitlements-projector && npm exec -- tsc -p jsconfig.json --noEmit
	cd components/entitlements-projector && npm test
	cd components/ui && npm ci
	cd components/ui && npm run typecheck
	cd components/ui && npm run build
	kubectl kustomize infra/postgres/overlays/ephemeral >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec components/migrations/infra/overlays/ephemeral >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec components/api/infra/overlays/ephemeral >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec components/accounts-projector/infra/overlays/ephemeral >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec components/entitlements-projector/infra/overlays/ephemeral >/dev/null
	kubectl kustomize components/ui/infra/overlays/ephemeral >/dev/null

migrate: ## Deploy the Documents database and run its migrations.
	skaffold run -m documents-postgres
	kubectl delete job -n documents migrations --ignore-not-found
	skaffold run --force -m documents-migrations
	kubectl wait -n documents --for=condition=complete --timeout=300s job/migrations || { kubectl logs -n documents job/migrations --all-containers=true; exit 1; }

deploy: migrate ## Deploy Documents once in the current cluster.
	skaffold run -m documents-api,documents-accounts-projector,documents-entitlements-projector,documents-ui

dev: ## Start the Documents development loop.
	$(MAKE) migrate
	exec skaffold dev -m documents-api,documents-accounts-projector,documents-entitlements-projector,documents-ui

test: ## Deploy Documents and its platform dependencies in a disposable cluster.
	$(MAKE) -C ../../platform/ingress deploy
	$(MAKE) -C ../../platform/event-bus deploy
	$(MAKE) deploy
	@: # Add domain integration tests here.
