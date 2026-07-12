.DEFAULT_GOAL := help

.PHONY: help deploy-crds deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

deploy-crds: ## Deploy Traefik CRDs.
	skaffold run -m ingress-crds
	kubectl wait --for=condition=Established --timeout=60s crd/ingressroutes.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/tlsstores.traefik.io

deploy: deploy-crds ## Deploy local Traefik TLS, hosts entries, and Traefik.
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

	skaffold run -m ingress
	kubectl rollout status -n traefik deploy/traefik-depl --timeout=300s
