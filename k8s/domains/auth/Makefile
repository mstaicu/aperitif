.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Auth workloads and manifests.
	cd api && npm ci
	cd api && npm exec -- eslint .
	cd api && npm exec -- tsc -p jsconfig.json --noEmit
	cd api && npm test
	cd ui && npm ci
	cd ui && npm run check
	kubectl kustomize deploy/postgres/overlays/prod-eu >/dev/null
	kubectl kustomize deploy/migrations/overlays/prod-eu >/dev/null
	kubectl kustomize deploy/cleanup/overlays/prod-eu >/dev/null
	kubectl kustomize deploy/api/overlays/prod-eu >/dev/null
	kubectl kustomize deploy/ui/overlays/prod-eu >/dev/null

migrate: ## Deploy the Auth database and run its migrations.
	skaffold run -m auth-postgres
	kubectl delete job -n auth migrations --ignore-not-found
	skaffold run --force -m auth-migrations
	kubectl wait -n auth --for=condition=complete --timeout=300s job/migrations || { kubectl logs -n auth job/migrations --all-containers=true; exit 1; }

deploy: migrate ## Deploy Auth once in the current cluster.
	skaffold run -m auth-api,auth-ui,auth-cleanup

dev: migrate ## Start the Auth development loop.
	skaffold dev -m auth-api,auth-ui,auth-cleanup
