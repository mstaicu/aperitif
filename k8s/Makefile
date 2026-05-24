.DEFAULT_GOAL := help

DOMAIN ?= tma.com

.PHONY: help flux-bootstrap-prod-eu deploy-identity dev-identity deploy-tenancy dev-tenancy deploy-capabilities dev-capabilities deploy-documents dev-documents dev deploy-ingress deploy-event-bus deploy-observability

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Domain targets

deploy-identity: ## Deploy identity and exit.
	$(MAKE) deploy-observability
	$(MAKE) deploy-ingress
	skaffold run -m identity-postgres-dev
	kubectl delete job -n identity migrate --ignore-not-found
	skaffold run --force -m identity-migrate-dev
	kubectl wait -n identity --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identity job/migrate --all-containers=true; exit 1; }
	skaffold run -m identity-api-dev,identity-ui-dev
	kubectl rollout status -n identity deploy/identity-api-depl --timeout=300s
	kubectl rollout status -n identity deploy/identity-ui-depl --timeout=300s

dev-identity: ## Prepare identity, then run identity in skaffold dev.
	$(MAKE) deploy-observability
	$(MAKE) deploy-ingress
	skaffold run -m identity-postgres-dev
	kubectl delete job -n identity migrate --ignore-not-found
	skaffold run --force -m identity-migrate-dev
	kubectl wait -n identity --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identity job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m identity-api-dev,identity-ui-dev

deploy-tenancy: ## Deploy tenancy plus required dependencies and exit.
	$(MAKE) deploy-identity
	$(MAKE) deploy-event-bus
	skaffold run -m tenancy-postgres-dev
	kubectl delete job -n tenancy migrate --ignore-not-found
	skaffold run --force -m tenancy-migrate-dev
	kubectl wait -n tenancy --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n tenancy job/migrate --all-containers=true; exit 1; }
	skaffold run -m tenancy-api-dev,tenancy-worker-dev
	kubectl rollout status -n tenancy deploy/tenancy-api-depl --timeout=300s
	kubectl rollout status -n tenancy deploy/tenancy-worker-depl --timeout=300s

dev-tenancy: ## Prepare tenancy, then run tenancy in skaffold dev.
	$(MAKE) deploy-identity
	$(MAKE) deploy-event-bus
	skaffold run -m tenancy-postgres-dev
	kubectl delete job -n tenancy migrate --ignore-not-found
	skaffold run --force -m tenancy-migrate-dev
	kubectl wait -n tenancy --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n tenancy job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m tenancy-api-dev,tenancy-worker-dev

deploy-capabilities: ## Deploy capabilities plus required dependencies and exit.
	$(MAKE) deploy-tenancy
	skaffold run -m capabilities-postgres-dev
	kubectl delete job -n capabilities migrate --ignore-not-found
	skaffold run --force -m capabilities-migrate-dev
	kubectl wait -n capabilities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n capabilities job/migrate --all-containers=true; exit 1; }
	skaffold run -m capabilities-api-dev,capabilities-worker-dev
	kubectl rollout status -n capabilities deploy/capabilities-api-depl --timeout=300s
	kubectl rollout status -n capabilities deploy/capabilities-worker-depl --timeout=300s

dev-capabilities: ## Prepare capabilities, then run capabilities in skaffold dev.
	$(MAKE) deploy-tenancy
	skaffold run -m capabilities-postgres-dev
	kubectl delete job -n capabilities migrate --ignore-not-found
	skaffold run --force -m capabilities-migrate-dev
	kubectl wait -n capabilities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n capabilities job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m capabilities-api-dev,capabilities-worker-dev

deploy-documents: ## Deploy documents plus required dependencies and exit.
	$(MAKE) deploy-capabilities
	skaffold run -m documents-postgres-dev
	kubectl delete job -n documents migrate --ignore-not-found
	skaffold run --force -m documents-migrate-dev
	kubectl wait -n documents --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n documents job/migrate --all-containers=true; exit 1; }
	skaffold run -m documents-api-dev,documents-worker-dev
	kubectl rollout status -n documents deploy/documents-api-depl --timeout=300s
	kubectl rollout status -n documents deploy/documents-worker-depl --timeout=300s

dev-documents: ## Prepare documents, then run documents in skaffold dev.
	$(MAKE) deploy-capabilities
	skaffold run -m documents-postgres-dev
	kubectl delete job -n documents migrate --ignore-not-found
	skaffold run --force -m documents-migrate-dev
	kubectl wait -n documents --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n documents job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m documents-api-dev,documents-worker-dev

# Full stack

dev: ## Prepare the full local stack, then run all domains in skaffold dev.
	$(MAKE) deploy-observability
	$(MAKE) deploy-ingress
	$(MAKE) deploy-event-bus
	skaffold run -m identity-postgres-dev,tenancy-postgres-dev,capabilities-postgres-dev,documents-postgres-dev
	kubectl delete job -n identity migrate --ignore-not-found
	kubectl delete job -n tenancy migrate --ignore-not-found
	kubectl delete job -n capabilities migrate --ignore-not-found
	kubectl delete job -n documents migrate --ignore-not-found
	skaffold run --force -m identity-migrate-dev,tenancy-migrate-dev,capabilities-migrate-dev,documents-migrate-dev
	kubectl wait -n identity --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identity job/migrate --all-containers=true; exit 1; }
	kubectl wait -n tenancy --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n tenancy job/migrate --all-containers=true; exit 1; }
	kubectl wait -n capabilities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n capabilities job/migrate --all-containers=true; exit 1; }
	kubectl wait -n documents --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n documents job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m identity-api-dev,identity-ui-dev,tenancy-api-dev,tenancy-worker-dev,capabilities-api-dev,capabilities-worker-dev,documents-api-dev,documents-worker-dev

# Platform dependencies

deploy-ingress: ## Deploy Traefik CRDs, dev TLS, hosts entry, and Traefik.
	skaffold run -m ingress-crds

	kubectl wait --for=condition=Established --timeout=60s crd/ingressroutes.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/ingressroutetcps.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/ingressrouteudps.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/middlewares.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/middlewaretcps.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/serverstransports.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/serverstransporttcps.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/tlsoptions.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/tlsstores.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/traefikservices.traefik.io

	mkcert -install

	grep -q "127.0.0.1 $(DOMAIN)" /etc/hosts || echo "127.0.0.1 $(DOMAIN)" | sudo tee -a /etc/hosts
	grep -q "127.0.0.1 api.$(DOMAIN)" /etc/hosts || echo "127.0.0.1 api.$(DOMAIN)" | sudo tee -a /etc/hosts

	mkcert \
		-cert-file /tmp/traefik-tls.crt \
		-key-file /tmp/traefik-tls.key \
		$(DOMAIN) "*.$(DOMAIN)" localhost 127.0.0.1 ::1

	kubectl create namespace traefik --dry-run=client -o yaml | kubectl apply -f -

	kubectl create secret tls traefik-tls \
		-n traefik \
		--cert=/tmp/traefik-tls.crt \
		--key=/tmp/traefik-tls.key \
		--dry-run=client -o yaml | kubectl apply -f -

	skaffold run -m ingress
	kubectl rollout status -n traefik deploy/traefik-depl --timeout=300s

deploy-event-bus: ## Deploy NATS JetStream and wait for readiness.
	skaffold run -m event-bus
	kubectl rollout status -n nats statefulset/nats-depl --timeout=300s

deploy-observability: ## Deploy OpenTelemetry Collector and wait for readiness.
	skaffold run -m observability
	kubectl rollout status -n otel deploy/otel-collector --timeout=300s

flux-bootstrap-prod-eu: ## Bootstrap Flux in prod-eu and create required Flux-local secrets.
	@test -n "$$GITHUB_TOKEN" || { echo "GITHUB_TOKEN is required"; exit 1; }
	@test -n "$$SOPS_AGE_KEY_FILE" || { echo "SOPS_AGE_KEY_FILE is required"; exit 1; }
	@test -f "$$SOPS_AGE_KEY_FILE" || { echo "SOPS_AGE_KEY_FILE does not exist: $$SOPS_AGE_KEY_FILE"; exit 1; }

	kubectl create namespace flux-system --dry-run=client -o yaml | kubectl apply -f -

	kubectl create secret generic sops-age \
		-n flux-system \
		--from-file=identity.agekey="$$SOPS_AGE_KEY_FILE" \
		--dry-run=client -o yaml | kubectl apply -f -

	flux bootstrap github \
		--owner=mstaicu \
		--repository=aperitif \
		--branch=master \
		--path=k8s/clusters/prod-eu \
		--namespace=flux-system \
		--secret-name=flux-system \
		--personal \
		--token-auth \
		--components=source-controller,kustomize-controller
