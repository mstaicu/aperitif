.DEFAULT_GOAL := help

.PHONY: help check migrate deploy dev deploy-direct dev-direct

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Auth workloads and manifests.
	cd workloads/api && npm ci
	cd workloads/api && npm exec -- eslint .
	cd workloads/api && npm exec -- tsc -p jsconfig.json --noEmit
	cd workloads/api && npm test
	cd workloads/ui && npm ci
	cd workloads/ui && npm run check
	kubectl kustomize workloads/postgres/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/migrations/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/cleanup/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/api/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/ui/infra/overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec workloads/api/infra/overlays/direct >/dev/null
	kubectl kustomize workloads/ui/infra/overlays/direct >/dev/null

migrate: ## Deploy the Auth database and run its migrations.
	skaffold run -m auth-postgres
	kubectl delete job -n auth migrations --ignore-not-found
	skaffold run --force -m auth-migrations
	kubectl wait -n auth --for=condition=complete --timeout=300s job/migrations || { kubectl logs -n auth job/migrations --all-containers=true; exit 1; }

deploy: migrate ## Deploy Auth once in the current cluster.
	skaffold run -m auth-api,auth-ui,auth-cleanup

dev: migrate ## Start the Auth development loop.
	skaffold dev -m auth-api,auth-ui,auth-cleanup

deploy-direct: migrate ## Deploy Auth without Traefik.
	skaffold run -p direct -m auth-api,auth-ui,auth-cleanup

dev-direct: migrate ## Start Auth without Traefik and forward the UI to localhost:3000.
	skaffold dev -p direct -m auth-api,auth-ui,auth-cleanup
