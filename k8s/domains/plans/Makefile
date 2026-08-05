.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Plans components, packages, and manifests.
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

migrate: ## Deploy the Plans database and run its migrations.
	skaffold run -m plans-postgres
	kubectl delete job -n plans migrations --ignore-not-found
	skaffold run --force -m plans-migrations
	kubectl wait -n plans --for=condition=complete --timeout=300s job/migrations || { kubectl logs -n plans job/migrations --all-containers=true; exit 1; }

deploy: migrate ## Deploy Plans once in the current cluster.
	skaffold run -m plans-api,plans-outbox-publisher,plans-accounts-projector

dev: migrate ## Start the Plans development loop.
	skaffold dev -m plans-api,plans-outbox-publisher,plans-accounts-projector
