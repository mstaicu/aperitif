.PHONY: check up dev e2e down

check:
	npm --prefix contracts ci
	npm --prefix contracts run check
	npm --prefix workloads/api ci
	npm --prefix workloads/api run check
	npm --prefix workloads/ui ci
	npm --prefix workloads/ui run check

up:
	skaffold run -m identity-postgres

	kubectl delete --namespace=identity --ignore-not-found job/migrations
	skaffold run -m identity-migrations
	kubectl wait --namespace=identity --for=condition=complete --timeout=300s job/migrations

	skaffold run -m identity-api,identity-outbox-relay,identity-retention,identity-ui

dev:
	skaffold run -m identity-postgres

	kubectl delete --namespace=identity --ignore-not-found job/migrations
	skaffold run -m identity-migrations
	kubectl wait --namespace=identity --for=condition=complete --timeout=300s job/migrations

	skaffold dev -m identity-api,identity-outbox-relay,identity-retention,identity-ui

e2e: up
	npm --prefix workloads/ui ci
	npm --prefix workloads/ui exec -- playwright install chromium
	npm --prefix workloads/ui run test:e2e

down:
	skaffold delete
