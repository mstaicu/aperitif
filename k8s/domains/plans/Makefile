.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Plans workloads, contracts, and manifests.
	cd api && npm ci
	cd api && npm exec -- eslint .
	cd api && npm exec -- tsc -p jsconfig.json --noEmit
	cd api && npm test
	cd contracts && npm ci
	cd contracts && npm test
	cd contracts && npm run build
	cd outbox && npm ci
	cd outbox && npm exec -- eslint .
	cd outbox && npm exec -- tsc -p jsconfig.json --noEmit
	cd outbox && npm test
	cd accounts-projection && npm ci
	cd accounts-projection && npm exec -- eslint .
	cd accounts-projection && npm exec -- tsc -p jsconfig.json --noEmit
	cd accounts-projection && npm test
	kubectl kustomize deploy/postgres/overlays/prod-eu >/dev/null
	kubectl kustomize deploy/migrations/overlays/prod-eu >/dev/null
	kubectl kustomize deploy/api/overlays/prod-eu >/dev/null
	kubectl kustomize deploy/outbox/overlays/prod-eu >/dev/null
	kubectl kustomize deploy/accounts-projection/overlays/prod-eu >/dev/null

migrate: ## Deploy the Plans database and run its migrations.
	skaffold run -m plans-postgres
	kubectl delete job -n plans migrations --ignore-not-found
	skaffold run --force -m plans-migrations
	kubectl wait -n plans --for=condition=complete --timeout=300s job/migrations || { kubectl logs -n plans job/migrations --all-containers=true; exit 1; }

deploy: migrate ## Deploy Plans once in the current cluster.
	skaffold run -m plans-api,plans-outbox,plans-accounts-projection

dev: migrate ## Start the Plans development loop.
	skaffold dev -m plans-api,plans-outbox,plans-accounts-projection
