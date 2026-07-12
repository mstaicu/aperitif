.DEFAULT_GOAL := help

.PHONY: help
.PHONY: deploy-ingress-crds deploy-ingress deploy-event-bus deploy-observability deploy-platform
.PHONY: flux-bootstrap-prod-eu

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-28s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Platform

deploy-ingress-crds: ## Deploy Traefik CRDs.
	cd platform/ingress && skaffold run -m ingress-crds
	kubectl wait --for=condition=Established --timeout=60s crd/ingressroutes.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/tlsstores.traefik.io

deploy-ingress: deploy-ingress-crds ## Deploy local Traefik TLS, hosts entry, and Traefik.
	mkcert -install

	grep -q "127.0.0.1 tma.com" /etc/hosts || echo "127.0.0.1 tma.com" | sudo tee -a /etc/hosts
	grep -q "127.0.0.1 api.tma.com" /etc/hosts || echo "127.0.0.1 api.tma.com" | sudo tee -a /etc/hosts

	mkcert \
		-cert-file /tmp/traefik-tls.crt \
		-key-file /tmp/traefik-tls.key \
		tma.com "*.tma.com" localhost 127.0.0.1 ::1

	kubectl create namespace traefik --dry-run=client -o yaml | kubectl apply -f -

	kubectl create secret tls traefik-tls \
		-n traefik \
		--cert=/tmp/traefik-tls.crt \
		--key=/tmp/traefik-tls.key \
		--dry-run=client -o yaml | kubectl apply -f -

	cd platform/ingress && skaffold run -m ingress
	kubectl rollout status -n traefik deploy/traefik-depl --timeout=300s

deploy-event-bus: ## Deploy NATS JetStream and wait for readiness.
	cd platform/event-bus && skaffold run -m event-bus
	kubectl rollout status -n nats statefulset/nats-depl --timeout=300s

deploy-observability: ## Deploy OpenTelemetry Collector and wait for readiness.
	cd platform/observability && skaffold run -m observability
	kubectl rollout status -n otel deploy/otel-collector --timeout=300s
	kubectl rollout status -n otel daemonset/otel-agent --timeout=300s

deploy-platform: ## Deploy shared ephemeral platform dependencies.
	$(MAKE) deploy-observability
	$(MAKE) deploy-ingress
	$(MAKE) deploy-event-bus

# Flux

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
