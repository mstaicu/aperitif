.PHONY: check up dev e2e down

check:
	npm --prefix workloads/api ci
	npm --prefix workloads/api run check
	npm --prefix workloads/ui ci
	npm --prefix workloads/ui run check
	kubectl kustomize workloads/postgres/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/migrations/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/retention/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/api/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/ui/infra/overlays/prod-eu >/dev/null
	skaffold render --digest-source=none --offline >/dev/null

up:
	skaffold run -m auth-postgres
	skaffold run -m auth-migrations
	kubectl wait --namespace=auth --for=condition=complete --timeout=300s job/migrations
	skaffold run -m auth-api,auth-retention,auth-ui

dev:
	skaffold run -m auth-postgres
	skaffold run -m auth-migrations
	kubectl wait --namespace=auth --for=condition=complete --timeout=300s job/migrations
	skaffold dev -m auth-api,auth-retention,auth-ui

e2e: up
	npm --prefix workloads/ui ci
	npm --prefix workloads/ui exec -- playwright install chromium
	npm --prefix workloads/ui run test:e2e

down:
	skaffold delete
