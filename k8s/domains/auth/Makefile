.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Auth components, packages, and manifests.
	cd components/api && npm ci
	cd components/api && npm exec -- eslint .
	cd components/api && npm exec -- tsc -p jsconfig.json --noEmit
	cd components/api && npm test
	cd components/ui && npm ci
	cd components/ui && npm run typecheck
	cd components/ui && npm run build
	kubectl kustomize infra/postgres/overlays/prod-eu >/dev/null
	kubectl kustomize components/migrations/infra/overlays/prod-eu >/dev/null
	kubectl kustomize components/cleanup/infra/overlays/prod-eu >/dev/null
	kubectl kustomize components/api/infra/overlays/prod-eu >/dev/null
	kubectl kustomize components/ui/infra/overlays/prod-eu >/dev/null

migrate: ## Deploy the Auth database and run its migrations.
	skaffold run -m auth-postgres
	kubectl delete job -n auth migrations --ignore-not-found
	skaffold run --force -m auth-migrations
	kubectl wait -n auth --for=condition=complete --timeout=300s job/migrations || { kubectl logs -n auth job/migrations --all-containers=true; exit 1; }

deploy: migrate ## Deploy Auth once in the current cluster.
	skaffold run -m auth-api,auth-ui,auth-cleanup

dev: migrate ## Start the Auth development loop.
	skaffold dev -m auth-api,auth-ui,auth-cleanup
