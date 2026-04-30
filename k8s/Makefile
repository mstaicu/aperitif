DOMAIN ?= tma.com

identities:
	$(MAKE) ingress
	skaffold run -m identities-db-dev
	skaffold run --force -m identities-migrate-dev
	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }
	skaffold run -m identities-api-dev
	kubectl rollout status -n identities deploy/identities-api-depl --timeout=300s

identities-dev:
	$(MAKE) ingress
	skaffold run -m identities-db-dev
	skaffold run --force -m identities-migrate-dev
	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m identities-api-dev

accounts:
	$(MAKE) identities
	$(MAKE) event-bus
	skaffold run -m accounts-db-dev
	skaffold run --force -m accounts-migrate-dev
	kubectl wait -n accounts --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n accounts job/migrate --all-containers=true; exit 1; }
	skaffold run -m accounts-api-dev,accounts-worker-dev
	kubectl rollout status -n accounts deploy/accounts-api-depl --timeout=300s
	kubectl rollout status -n accounts deploy/accounts-worker-depl --timeout=300s

accounts-dev:
	$(MAKE) identities
	$(MAKE) event-bus
	skaffold run -m accounts-db-dev
	skaffold run --force -m accounts-migrate-dev
	kubectl wait -n accounts --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n accounts job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m accounts-api-dev,accounts-worker-dev

dev:
	$(MAKE) ingress
	$(MAKE) event-bus
	skaffold run -m identities-db-dev,accounts-db-dev
	skaffold run --force -m identities-migrate-dev,accounts-migrate-dev
	kubectl wait -n identities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identities job/migrate --all-containers=true; exit 1; }
	kubectl wait -n accounts --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n accounts job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m identities-api-dev,accounts-api-dev,accounts-worker-dev

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

event-bus:
	skaffold run -m event-bus
	kubectl rollout status -n nats statefulset/nats-depl --timeout=300s
