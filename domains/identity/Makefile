.PHONY: check up dev e2e down

check:
	npm --prefix contracts ci
	npm --prefix contracts run check
	npm --prefix api ci
	npm --prefix api run check
	npm --prefix ui ci
	npm --prefix ui run check

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
	npm --prefix ui ci
	npm --prefix ui exec -- playwright install chromium
	npm --prefix ui run test:e2e

down:
	skaffold delete
