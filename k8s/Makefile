.DEFAULT_GOAL := help

DOMAIN ?= tma.com

.PHONY: help identity identity-dev accounts accounts-dev dev ingress event-bus observability

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Domain targets

identity: ## Deploy identity and exit.
	$(MAKE) observability
	$(MAKE) ingress
	skaffold run -m identity-db-dev
	kubectl delete job -n identity migrate --ignore-not-found
	skaffold run --force -m identity-migrate-dev
	kubectl wait -n identity --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identity job/migrate --all-containers=true; exit 1; }
	skaffold run -m identity-api-dev,identity-ui-dev
	kubectl rollout status -n identity deploy/identity-api-depl --timeout=300s
	kubectl rollout status -n identity deploy/identity-ui-depl --timeout=300s

identity-dev: ## Prepare identity, then run identity in skaffold dev.
	$(MAKE) observability
	$(MAKE) ingress
	skaffold run -m identity-db-dev
	kubectl delete job -n identity migrate --ignore-not-found
	skaffold run --force -m identity-migrate-dev
	kubectl wait -n identity --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identity job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m identity-api-dev,identity-ui-dev

accounts: ## Deploy accounts plus required dependencies and exit.
	$(MAKE) identity
	$(MAKE) event-bus
	skaffold run -m accounts-db-dev
	kubectl delete job -n accounts migrate --ignore-not-found
	skaffold run --force -m accounts-migrate-dev
	kubectl wait -n accounts --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n accounts job/migrate --all-containers=true; exit 1; }
	skaffold run -m accounts-api-dev,accounts-worker-dev
	kubectl rollout status -n accounts deploy/accounts-api-depl --timeout=300s
	kubectl rollout status -n accounts deploy/accounts-worker-depl --timeout=300s

accounts-dev: ## Prepare accounts, then run accounts in skaffold dev.
	$(MAKE) identity
	$(MAKE) event-bus
	skaffold run -m accounts-db-dev
	kubectl delete job -n accounts migrate --ignore-not-found
	skaffold run --force -m accounts-migrate-dev
	kubectl wait -n accounts --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n accounts job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m accounts-api-dev,accounts-worker-dev

# Full stack

dev: ## Prepare the full local stack, then run all domains in skaffold dev.
	$(MAKE) observability
	$(MAKE) ingress
	$(MAKE) event-bus
	skaffold run -m identity-db-dev,accounts-db-dev
	kubectl delete job -n identity migrate --ignore-not-found
	kubectl delete job -n accounts migrate --ignore-not-found
	skaffold run --force -m identity-migrate-dev,accounts-migrate-dev
	kubectl wait -n identity --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identity job/migrate --all-containers=true; exit 1; }
	kubectl wait -n accounts --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n accounts job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m identity-api-dev,identity-ui-dev,accounts-api-dev,accounts-worker-dev

# Platform dependencies

ingress: ## Install Gateway CRDs, dev TLS, hosts entry, and Traefik.
	skaffold run -m ingress-crds

	kubectl wait --for=condition=Established --timeout=60s crd/gatewayclasses.gateway.networking.k8s.io
	kubectl wait --for=condition=Established --timeout=60s crd/gateways.gateway.networking.k8s.io
	kubectl wait --for=condition=Established --timeout=60s crd/grpcroutes.gateway.networking.k8s.io
	kubectl wait --for=condition=Established --timeout=60s crd/httproutes.gateway.networking.k8s.io
	kubectl wait --for=condition=Established --timeout=60s crd/referencegrants.gateway.networking.k8s.io
	kubectl wait --for=condition=Established --timeout=60s crd/backendtlspolicies.gateway.networking.k8s.io

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

event-bus: ## Deploy NATS JetStream and wait for readiness.
	skaffold run -m event-bus
	kubectl rollout status -n nats statefulset/nats-depl --timeout=300s

observability: ## Deploy OpenTelemetry Collector and wait for readiness.
	skaffold run -m observability
	kubectl rollout status -n otel deploy/otel-collector --timeout=300s
