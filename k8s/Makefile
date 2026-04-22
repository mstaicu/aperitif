auth-bootstrap:
	skaffold run -m auth-db-local
	skaffold run --force -m auth-migrate-local
	kubectl wait -n auth --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n auth job/migrate --all-containers=true; exit 1; }

auth-dev:
	$(MAKE) auth-bootstrap
	exec skaffold dev -m auth-api-local

auth-run:
	$(MAKE) auth-bootstrap
	skaffold run -m auth-api-local

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
	skaffold run -m auth-db-local,spaces-db-local
	skaffold run --force -m auth-migrate-local,spaces-migrate-local
	kubectl wait -n auth --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n auth job/migrate --all-containers=true; exit 1; }
	kubectl wait -n spaces --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n spaces job/migrate --all-containers=true; exit 1; }

local-dev:
	$(MAKE) local-bootstrap
	exec skaffold dev -m auth-api-local,spaces-api-local

local-run:
	$(MAKE) local-bootstrap
	skaffold run -m auth-api-local,spaces-api-local
