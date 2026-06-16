.DEFAULT_GOAL := help
.NOTPARALLEL:

DOMAIN ?= tma.com

.PHONY: help
.PHONY: deploy-ingress-crds deploy-ingress deploy-event-bus deploy-observability deploy-platform
.PHONY: apply-identity-db run-identity-migrations apply-identity-api apply-identity-ui apply-identity-cleanup deploy-identity
.PHONY: apply-accounts-db run-accounts-migrations apply-accounts-api apply-accounts-worker deploy-accounts
.PHONY: apply-capabilities-db run-capabilities-migrations apply-capabilities-api apply-capabilities-worker deploy-capabilities
.PHONY: apply-documents-db run-documents-migrations apply-documents-api apply-documents-worker apply-documents-ui deploy-documents
.PHONY: deploy-core deploy-all
.PHONY: integration-identity integration-accounts integration-capabilities integration-documents
.PHONY: dev-all dev
.PHONY: flux-bootstrap-prod-eu

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-28s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Platform

deploy-ingress-crds: ## Deploy Traefik CRDs.
	skaffold run -m ingress-crds
	kubectl wait --for=condition=Established --timeout=60s crd/ingressroutes.traefik.io
	kubectl wait --for=condition=Established --timeout=60s crd/tlsstores.traefik.io

deploy-ingress: deploy-ingress-crds ## Deploy local Traefik TLS, hosts entry, and Traefik.
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
	kubectl rollout status -n otel daemonset/otel-agent --timeout=300s

deploy-platform: deploy-observability deploy-ingress deploy-event-bus ## Deploy shared ephemeral platform dependencies.

# Identity

apply-identity-db: ## Apply the identity database.
	skaffold run -m identity-postgres-dev

run-identity-migrations: ## Run identity migrations.
	kubectl delete job -n identity migrate --ignore-not-found
	skaffold run --force -m identity-migrate-dev
	kubectl wait -n identity --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identity job/migrate --all-containers=true; exit 1; }

apply-identity-api: ## Apply the identity API.
	skaffold run -m identity-api-dev
	kubectl rollout status -n identity deploy/identity-api-depl --timeout=300s

apply-identity-ui: ## Apply the identity UI.
	skaffold run -m identity-ui-dev
	kubectl rollout status -n identity deploy/identity-ui-depl --timeout=300s

apply-identity-cleanup: ## Apply identity cleanup jobs.
	skaffold run -m identity-cleanup-dev

deploy-identity: apply-identity-db run-identity-migrations apply-identity-api apply-identity-ui apply-identity-cleanup ## Deploy identity only.

# Accounts

apply-accounts-db: ## Apply the accounts database.
	skaffold run -m accounts-postgres-dev

run-accounts-migrations: ## Run accounts migrations.
	kubectl delete job -n accounts migrate --ignore-not-found
	skaffold run --force -m accounts-migrate-dev
	kubectl wait -n accounts --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n accounts job/migrate --all-containers=true; exit 1; }

apply-accounts-api: ## Apply the accounts API.
	skaffold run -m accounts-api-dev
	kubectl rollout status -n accounts deploy/accounts-api-depl --timeout=300s

apply-accounts-worker: ## Apply the accounts worker.
	skaffold run -m accounts-worker-dev
	kubectl rollout status -n accounts deploy/accounts-worker-depl --timeout=300s

deploy-accounts: apply-accounts-db run-accounts-migrations apply-accounts-api apply-accounts-worker ## Deploy accounts only.

# Capabilities

apply-capabilities-db: ## Apply the capabilities database.
	skaffold run -m capabilities-postgres-dev

run-capabilities-migrations: ## Run capabilities migrations.
	kubectl delete job -n capabilities migrate --ignore-not-found
	skaffold run --force -m capabilities-migrate-dev
	kubectl wait -n capabilities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n capabilities job/migrate --all-containers=true; exit 1; }

apply-capabilities-api: ## Apply the capabilities API.
	skaffold run -m capabilities-api-dev
	kubectl rollout status -n capabilities deploy/capabilities-api-depl --timeout=300s

apply-capabilities-worker: ## Apply the capabilities worker.
	skaffold run -m capabilities-worker-dev
	kubectl rollout status -n capabilities deploy/capabilities-worker-depl --timeout=300s

deploy-capabilities: apply-capabilities-db run-capabilities-migrations apply-capabilities-api apply-capabilities-worker ## Deploy capabilities only.

# Documents

apply-documents-db: ## Apply the documents database.
	skaffold run -m documents-postgres-dev

run-documents-migrations: ## Run documents migrations.
	kubectl delete job -n documents migrate --ignore-not-found
	skaffold run --force -m documents-migrate-dev
	kubectl wait -n documents --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n documents job/migrate --all-containers=true; exit 1; }

apply-documents-api: ## Apply the documents API.
	skaffold run -m documents-api-dev
	kubectl rollout status -n documents deploy/documents-api-depl --timeout=300s

apply-documents-worker: ## Apply the documents worker.
	skaffold run -m documents-worker-dev
	kubectl rollout status -n documents deploy/documents-worker-depl --timeout=300s

apply-documents-ui: ## Apply the documents UI.
	skaffold run -m documents-ui-dev
	kubectl rollout status -n documents deploy/documents-ui-depl --timeout=300s

deploy-documents: apply-documents-db run-documents-migrations apply-documents-api apply-documents-worker apply-documents-ui ## Deploy documents only.

# Scenarios

deploy-core: deploy-platform deploy-identity deploy-accounts deploy-capabilities ## Deploy core domains and shared platform dependencies.

deploy-all: deploy-core deploy-documents ## Deploy the full ephemeral stack.

integration-identity: deploy-platform deploy-identity ## Deploy identity with its integration dependencies.

integration-accounts: deploy-platform deploy-identity deploy-accounts ## Deploy accounts with its integration dependencies.

integration-capabilities: deploy-core ## Deploy capabilities with its integration dependencies.

integration-documents: deploy-all ## Deploy documents with its integration dependencies.

# Dev loop

dev-all: deploy-platform ## Prepare the full stack, then run all domains in skaffold dev.
	skaffold run -m identity-postgres-dev,accounts-postgres-dev,capabilities-postgres-dev,documents-postgres-dev
	kubectl delete job -n identity migrate --ignore-not-found
	kubectl delete job -n accounts migrate --ignore-not-found
	kubectl delete job -n capabilities migrate --ignore-not-found
	kubectl delete job -n documents migrate --ignore-not-found
	skaffold run --force -m identity-migrate-dev,accounts-migrate-dev,capabilities-migrate-dev,documents-migrate-dev
	kubectl wait -n identity --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n identity job/migrate --all-containers=true; exit 1; }
	kubectl wait -n accounts --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n accounts job/migrate --all-containers=true; exit 1; }
	kubectl wait -n capabilities --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n capabilities job/migrate --all-containers=true; exit 1; }
	kubectl wait -n documents --for=condition=complete --timeout=300s job/migrate || { kubectl logs -n documents job/migrate --all-containers=true; exit 1; }
	exec skaffold dev -m identity-api-dev,identity-ui-dev,identity-cleanup-dev,accounts-api-dev,accounts-worker-dev,capabilities-api-dev,capabilities-worker-dev,documents-api-dev,documents-worker-dev,documents-ui-dev

dev: dev-all ## Alias for dev-all.

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
