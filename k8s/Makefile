DOMAIN ?= tma.com

dev-identities:
	$(MAKE) ingress

	skaffold run -m identities-db-dev
	skaffold run --force -m identities-migrate-dev

	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }

	exec skaffold dev -m identities-api-dev

dev-spaces:
	$(MAKE) ingress

	skaffold run -m spaces-db-dev
	skaffold run --force -m spaces-migrate-dev

	kubectl wait -n spaces --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n spaces job/migrate --all-containers=true; exit 1; }

	exec skaffold dev -m spaces-api-dev

dev:
	$(MAKE) ingress

	skaffold run -m identities-db-dev,spaces-db-dev
	skaffold run --force -m identities-migrate-dev,spaces-migrate-dev

	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }
	kubectl wait -n spaces --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n spaces job/migrate --all-containers=true; exit 1; }

	exec skaffold dev -m identities-api-dev,spaces-api-dev

ingress:
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

sops-updatekeys:
	@rg -l '^sops:' domains platform -g '*.yaml' | while read -r file; do \
		echo "Updating $$file"; \
		sops updatekeys -y "$$file"; \
	done

sops-secret:
	@kubectl create secret generic sops-age \
		-n flux-system \
		--from-file=identity.agekey="$(SOPS_AGE_KEY_FILE)" \
		--dry-run=client -o yaml | kubectl apply -f -

sops-pubkey:
	@age-keygen -y "$(SOPS_AGE_KEY_FILE)"
