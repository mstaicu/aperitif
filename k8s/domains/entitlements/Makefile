.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Entitlements components, packages, and manifests.
	cd components/api && npm ci
	cd components/api && npm exec -- eslint .
	cd components/api && npm exec -- tsc -p jsconfig.json --noEmit
	cd components/api && npm test
	cd packages/contracts && npm ci
	cd packages/contracts && npm run build
	cd components/outbox-publisher && npm ci
	cd components/outbox-publisher && npm exec -- eslint .
	cd components/outbox-publisher && npm exec -- tsc -p jsconfig.json --noEmit
	cd components/outbox-publisher && npm test
	cd components/accounts-projector && npm ci
	cd components/accounts-projector && npm exec -- eslint .
	cd components/accounts-projector && npm exec -- tsc -p jsconfig.json --noEmit
	cd components/accounts-projector && npm test
	kubectl kustomize infra/postgres/overlays/prod-eu >/dev/null
	kubectl kustomize components/migrations/infra/overlays/prod-eu >/dev/null
	kubectl kustomize components/api/infra/overlays/prod-eu >/dev/null
	kubectl kustomize components/outbox-publisher/infra/overlays/prod-eu >/dev/null
	kubectl kustomize components/accounts-projector/infra/overlays/prod-eu >/dev/null

migrate: ## Deploy the Entitlements database and run its migrations.
	skaffold run -m entitlements-postgres
	kubectl delete job -n entitlements migrations --ignore-not-found
	skaffold run --force -m entitlements-migrations
	kubectl wait -n entitlements --for=condition=complete --timeout=300s job/migrations || { kubectl logs -n entitlements job/migrations --all-containers=true; exit 1; }

deploy: migrate ## Deploy Entitlements once in the current cluster.
	skaffold run -m entitlements-api,entitlements-outbox-publisher,entitlements-accounts-projector

dev: ## Start the Entitlements development loop.
	$(MAKE) migrate
	exec skaffold dev -m entitlements-api,entitlements-outbox-publisher,entitlements-accounts-projector
