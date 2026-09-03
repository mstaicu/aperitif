.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Accounts workloads, contracts, and manifests.
	cd workloads/api && npm ci
	cd workloads/api && npm exec -- eslint .
	cd workloads/api && npm exec -- tsc -p jsconfig.json --noEmit
	cd workloads/api && npm test

	cd contracts && npm ci
	cd contracts && npm test
	cd contracts && npm run build

	kubectl kustomize workloads/postgres/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/migrations/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/api/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/outbox-relay/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/postgres/infra/overlays/local-edge >/dev/null
	kubectl kustomize workloads/migrations/infra/overlays/local-edge >/dev/null
	kubectl kustomize workloads/api/infra/overlays/local-edge >/dev/null
	kubectl kustomize workloads/outbox-relay/infra/overlays/local-edge >/dev/null

migrate: ## Deploy the Accounts database and run its migrations.
	skaffold run -m accounts-postgres
	kubectl delete job -n accounts migrations --ignore-not-found
	skaffold run --force -m accounts-migrations
	kubectl wait -n accounts --for=condition=complete --timeout=300s job/migrations || { kubectl logs -n accounts job/migrations --all-containers=true; exit 1; }

deploy: migrate ## Deploy Accounts once in the current cluster.
	skaffold run -m accounts-api,accounts-outbox-relay

dev: migrate ## Start the Accounts development loop.
	skaffold dev -m accounts-api,accounts-outbox-relay
