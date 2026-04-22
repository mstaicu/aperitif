auth-bootstrap:
	skaffold run -m auth-db-local
	skaffold run --force -m auth-migrate-local

auth-dev:
	$(MAKE) auth-bootstrap
	exec skaffold dev -m auth-api-local

auth-run:
	$(MAKE) auth-bootstrap
	skaffold run -m auth-api-local

spaces-bootstrap:
	skaffold run -m spaces-db-local
	skaffold run --force -m spaces-migrate-local

spaces-dev:
	$(MAKE) spaces-bootstrap
	exec skaffold dev -m spaces-api-local

spaces-run:
	$(MAKE) spaces-bootstrap
	skaffold run -m spaces-api-local

local-platform:
	skaffold run -m ingress-crds,ingress,observability,event-bus

local-bootstrap:
	$(MAKE) local-platform
	skaffold run -m auth-db-local,spaces-db-local
	skaffold run --force -m auth-migrate-local,spaces-migrate-local

local-dev:
	$(MAKE) local-bootstrap
	exec skaffold dev -m auth-api-local,spaces-api-local

local-run:
	$(MAKE) local-bootstrap
	skaffold run -m auth-api-local,spaces-api-local
