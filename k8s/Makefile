.DEFAULT_GOAL := help

DOMAIN ?= tma.com

.PHONY: help identities identities-dev tenancy tenancy-dev dev ingress event-bus

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Domain targets

identities: ## Deploy identities and exit.
	$(MAKE) ingress
	skaffold run -m identities-db-dev
	skaffold run --force -m identities-migrate-dev
	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }
	skaffold run -m identities-api-dev
	kubectl rollout status -n identities deploy/identities-api-depl --timeout=300s

identities-dev: ## Prepare identities, then run identities in skaffold dev.
	$(MAKE) ingress
	skaffold run -m identities-db-dev
	skaffold run --force -m identities-migrate-dev
	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m identities-api-dev

tenancy: ## Deploy tenancy plus required dependencies and exit.
	$(MAKE) identities
	$(MAKE) event-bus
	skaffold run -m tenancy-db-dev
	skaffold run --force -m tenancy-migrate-dev
	kubectl wait -n tenancy --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n tenancy job/migrate --all-containers=true; exit 1; }
	skaffold run -m tenancy-api-dev,tenancy-worker-dev
	kubectl rollout status -n tenancy deploy/tenancy-api-depl --timeout=300s
	kubectl rollout status -n tenancy deploy/tenancy-worker-depl --timeout=300s

tenancy-dev: ## Prepare tenancy, then run tenancy in skaffold dev.
	$(MAKE) identities
	$(MAKE) event-bus
	skaffold run -m tenancy-db-dev
	skaffold run --force -m tenancy-migrate-dev
	kubectl wait -n tenancy --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n tenancy job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m tenancy-api-dev,tenancy-worker-dev

# Full stack

dev: ## Prepare the full local stack, then run all domains in skaffold dev.
	$(MAKE) ingress
	$(MAKE) event-bus
	skaffold run -m identities-db-dev,tenancy-db-dev
	skaffold run --force -m identities-migrate-dev,tenancy-migrate-dev
	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }
	kubectl wait -n tenancy --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n tenancy job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m identities-api-dev,tenancy-api-dev,tenancy-worker-dev

# Platform dependencies

ingress: ## Install Gateway CRDs, dev TLS, hosts entry, and Traefik.
	skaffold run -m ingress-crds

	kubectl wait --for=condition=Established --timeout=60s crd/gatewayclasses.gateway.networking.k8s.io
	kubectl wait --for=condition=Established --timeout=60s crd/gateways.gateway.networking.k8s.io
	kubectl wait --for=condition=Established --timeout=60s crd/httproutes.gateway.networking.k8s.io

	mkcert -install

	grep -q "127.0.0.1 $(DOMAIN)" /etc/hosts || echo "127.0.0.1 $(DOMAIN)" | sudo tee -a /etc/hosts

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

event-bus: ## Deploy NATS JetStream and wait for readiness.
	skaffold run -m event-bus
	kubectl rollout status -n nats statefulset/nats-depl --timeout=300s
