.DEFAULT_GOAL := help

.PHONY: help check deploy-crds deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate the production Ingress manifests.
	kubectl kustomize crds >/dev/null
	kubectl kustomize overlays/prod-eu >/dev/null

deploy-crds:
	kubectl apply -k crds
	kubectl wait --for=condition=Established --timeout=60s crd/ingressroutes.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/tlsstores.traefik.io

deploy: deploy-crds ## Deploy local Traefik TLS, hosts entries, and Traefik.
	mkcert -install

	grep -q "127.0.0.1 tma.com" /etc/hosts || echo "127.0.0.1 tma.com" | sudo tee -a /etc/hosts
	grep -q "127.0.0.1 api.tma.com" /etc/hosts || echo "127.0.0.1 api.tma.com" | sudo tee -a /etc/hosts
	grep -q "127.0.0.1 traefik.tma.com" /etc/hosts || echo "127.0.0.1 traefik.tma.com" | sudo tee -a /etc/hosts
	grep -q "127.0.0.1 observe.tma.com" /etc/hosts || echo "127.0.0.1 observe.tma.com" | sudo tee -a /etc/hosts

	mkcert \
		-cert-file /tmp/traefik-tls.crt \
		-key-file /tmp/traefik-tls.key \
		tma.com "*.tma.com" localhost 127.0.0.1 ::1

	kubectl create namespace traefik --dry-run=client -o yaml | kubectl apply -f -

	kubectl create secret tls tls \
		-n traefik \
		--cert=/tmp/traefik-tls.crt \
		--key=/tmp/traefik-tls.key \
		--dry-run=client -o yaml | kubectl apply -f -

	kubectl apply -k overlays/ephemeral
	kubectl rollout status -n traefik deploy/traefik --timeout=300s
