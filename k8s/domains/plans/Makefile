.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Plans workloads, contracts, and manifests.
	cd workloads/api && npm ci
	cd workloads/api && npm exec -- eslint .
	cd workloads/api && npm exec -- tsc -p jsconfig.json --noEmit
	cd workloads/api && npm test
	cd contracts && npm ci
	cd contracts && npm test
	cd contracts && npm run build
	cd workloads/accounts-projection && npm ci
	cd workloads/accounts-projection && npm exec -- eslint .
	cd workloads/accounts-projection && npm exec -- tsc -p jsconfig.json --noEmit
	cd workloads/accounts-projection && npm test
	kubectl kustomize workloads/postgres/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/migrations/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/api/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/outbox-relay/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/accounts-projection/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/postgres/infra/overlays/local >/dev/null
	kubectl kustomize workloads/migrations/infra/overlays/local >/dev/null
	kubectl kustomize workloads/api/infra/overlays/local >/dev/null
	kubectl kustomize workloads/outbox-relay/infra/overlays/local >/dev/null
	kubectl kustomize workloads/accounts-projection/infra/overlays/local >/dev/null

migrate: ## Deploy the Plans database and run its migrations.
	skaffold run -m plans-postgres
	kubectl delete job -n plans migrations --ignore-not-found
	skaffold run --force -m plans-migrations
	kubectl wait -n plans --for=condition=complete --timeout=300s job/migrations || { kubectl logs -n plans job/migrations --all-containers=true; exit 1; }

deploy: migrate ## Deploy Plans once in the current cluster.
	skaffold run -m plans-api,plans-outbox-relay,plans-accounts-projection

dev: migrate ## Start the Plans development loop.
	skaffold dev -m plans-api,plans-outbox-relay,plans-accounts-projection
