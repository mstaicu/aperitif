.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Accounts components, packages, and manifests.
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

	kubectl kustomize infra/postgres/overlays/prod-eu >/dev/null
	kubectl kustomize components/migrations/infra/overlays/prod-eu >/dev/null
	kubectl kustomize components/api/infra/overlays/prod-eu >/dev/null
	kubectl kustomize components/outbox-publisher/infra/overlays/prod-eu >/dev/null

migrate: ## Deploy the Accounts database and run its migrations.
	skaffold run -m accounts-postgres
	kubectl delete job -n accounts migrations --ignore-not-found
	skaffold run --force -m accounts-migrations
	kubectl wait -n accounts --for=condition=complete --timeout=300s job/migrations || { kubectl logs -n accounts job/migrations --all-containers=true; exit 1; }

deploy: migrate ## Deploy Accounts once in the current cluster.
	skaffold run -m accounts-api,accounts-outbox-publisher

dev: ## Start the Accounts development loop.
	$(MAKE) migrate
	exec skaffold dev -m accounts-api,accounts-outbox-publisher
