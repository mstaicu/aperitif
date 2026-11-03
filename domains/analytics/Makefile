.PHONY: check up dev down

check:
	npm --prefix workloads/projector ci
	npm --prefix workloads/projector run check

up:
	skaffold run -m analytics-postgres
	kubectl delete --namespace=analytics --ignore-not-found job/migrations
	skaffold run -m analytics-migrations
	kubectl wait --namespace=analytics --for=condition=complete --timeout=300s job/migrations
	skaffold run -m analytics-projector

dev:
	skaffold run -m analytics-postgres
	kubectl delete --namespace=analytics --ignore-not-found job/migrations
	skaffold run -m analytics-migrations
	kubectl wait --namespace=analytics --for=condition=complete --timeout=300s job/migrations
	skaffold dev -m analytics-projector

down:
	skaffold delete
