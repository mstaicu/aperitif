.PHONY: check up dev down

check:
	npm --prefix contracts ci
	npm --prefix contracts run check
	npm --prefix workloads/api ci
	npm --prefix workloads/api run check
	kubectl kustomize workloads/postgres/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/migrations/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/api/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/outbox-relay/infra/overlays/prod-eu >/dev/null
	skaffold render --digest-source=none --offline >/dev/null

up:
	skaffold run -m accounts-postgres
	skaffold run -m accounts-migrations
	kubectl wait --namespace=accounts --for=condition=complete --timeout=300s job/migrations
	skaffold run -m accounts-api,accounts-outbox-relay

dev:
	skaffold run -m accounts-postgres
	skaffold run -m accounts-migrations
	kubectl wait --namespace=accounts --for=condition=complete --timeout=300s job/migrations
	skaffold dev -m accounts-api,accounts-outbox-relay

down:
	skaffold delete
