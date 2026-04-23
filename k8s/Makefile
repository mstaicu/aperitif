dev-identities:
	skaffold run -m identities-db-dev
	skaffold run --force -m identities-migrate-dev

	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }

	exec skaffold dev -m identities-api-dev

dev-spaces:
	skaffold run -m spaces-db-dev
	skaffold run --force -m spaces-migrate-dev

	kubectl wait -n spaces --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n spaces job/migrate --all-containers=true; exit 1; }

	exec skaffold dev -m spaces-api-dev

dev:
	skaffold run -m ingress-crds
	skaffold run -m ingress

	skaffold run -m identities-db-dev,spaces-db-dev
	skaffold run --force -m identities-migrate-dev,spaces-migrate-dev

	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }
	kubectl wait -n spaces --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n spaces job/migrate --all-containers=true; exit 1; }

	exec skaffold dev -m identities-api-dev,spaces-api-dev