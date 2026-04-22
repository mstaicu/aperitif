identities-bootstrap:
	skaffold run -m identities-db-local
	skaffold run --force -m identities-migrate-local
	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }

identities-dev:
	$(MAKE) identities-bootstrap
	exec skaffold dev -m identities-api-local

identities-run:
	$(MAKE) identities-bootstrap
	skaffold run -m identities-api-local

spaces-bootstrap:
	skaffold run -m spaces-db-local
	skaffold run --force -m spaces-migrate-local
	kubectl wait -n spaces --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n spaces job/migrate --all-containers=true; exit 1; }

spaces-dev:
	$(MAKE) spaces-bootstrap
	exec skaffold dev -m spaces-api-local

spaces-run:
	$(MAKE) spaces-bootstrap
	skaffold run -m spaces-api-local

# If observability and event-bus come back into the root platform graph:
# skaffold run -m ingress-crds,ingress,observability,event-bus
local-platform:
	skaffold run -m ingress-crds,ingress

local-bootstrap:
	$(MAKE) local-platform
	skaffold run -m identities-db-local,spaces-db-local
	skaffold run --force -m identities-migrate-local,spaces-migrate-local
	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }
	kubectl wait -n spaces --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n spaces job/migrate --all-containers=true; exit 1; }

local-dev:
	$(MAKE) local-bootstrap
	exec skaffold dev -m identities-api-local,spaces-api-local

local-run:
	$(MAKE) local-bootstrap
	skaffold run -m identities-api-local,spaces-api-local
