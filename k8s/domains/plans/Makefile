.PHONY: check up dev down

check:
	npm --prefix contracts ci
	npm --prefix contracts run check
	npm --prefix workloads/api ci
	npm --prefix workloads/api run check
	npm --prefix workloads/accounts-projection ci
	npm --prefix workloads/accounts-projection run check
	kubectl kustomize workloads/postgres/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/migrations/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/api/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/outbox-relay/infra/overlays/prod-eu >/dev/null
	kubectl kustomize workloads/accounts-projection/infra/overlays/prod-eu >/dev/null
	skaffold render --digest-source=none --offline >/dev/null

up:
	skaffold run -m plans-postgres
	skaffold run -m plans-migrations
	kubectl wait --namespace=plans --for=condition=complete --timeout=300s job/migrations
	skaffold run -m plans-api,plans-outbox-relay,plans-accounts-projection

dev:
	skaffold run -m plans-postgres
	skaffold run -m plans-migrations
	kubectl wait --namespace=plans --for=condition=complete --timeout=300s job/migrations
	skaffold dev -m plans-api,plans-outbox-relay,plans-accounts-projection

down:
	skaffold delete
