DOMAIN = tma.com
DOTENV_SECRET_NAME = dotenv
ENV_FILE = .env

check-tools:
	@command -v mkcert >/dev/null 2>&1 || { echo >&2 "mkcert is not installed. Please install it and try again."; exit 1; }
	@command -v kubectl >/dev/null 2>&1 || { echo >&2 "kubectl is not installed. Please install it and try again."; exit 1; }
	@command -v skaffold >/dev/null 2>&1 || { echo >&2 "skaffold is not installed. Please install it and try again."; exit 1; }
	@echo "✅ all required tools are installed"

generate-cert-secret:
	@echo "🪪 installing mkcert certificate authority"
	@mkcert -install

	@echo "🪪 generating certificate and key for domain $(DOMAIN) using mkcert"

	@cert_file=$$(mktemp) && \
	key_file=$$(mktemp) && \
	mkcert -cert-file $$cert_file -key-file $$key_file $(DOMAIN) && \
	kubectl create secret tls certs-secret --cert=$$cert_file --key=$$key_file && \
	rm $$cert_file $$key_file

add-host: generate-cert-secret
	@echo "📍 checking /etc/hosts for existing entry"

	@if ! grep -q "^127.0.0.1 $(DOMAIN)$$" /etc/hosts; then \
		echo "127.0.0.1 $(DOMAIN)" | sudo tee -a /etc/hosts > /dev/null; \
		echo "📍 127.0.0.1 $(DOMAIN) added to /etc/hosts"; \
	else \
		echo "📍 127.0.0.1 $(DOMAIN) already exists in /etc/hosts"; \
	fi

create-env-secret: add-host
	@echo "🔐 checking if Kubernetes secret/$(DOTENV_SECRET_NAME) exists..."
	@if kubectl get secret $(DOTENV_SECRET_NAME) >/dev/null 2>&1; then \
		echo "🔐 secret/$(DOTENV_SECRET_NAME) exists, skipping creation"; \
	else \
		echo "🔐 secret/$(DOTENV_SECRET_NAME) does not exist, creating it from $(ENV_FILE)..."; \
		kubectl create secret generic $(DOTENV_SECRET_NAME) --from-env-file=$(ENV_FILE); \
	fi

dev: create-env-secret
# @echo "👷🏻‍♂️ applying config maps"
# @kubectl apply -f infra/cm

	@echo "👷🏻‍♂️ applying custom resource definitions"
	@kubectl apply -f infra/crd/traefik-crd.yaml

	@echo "👷🏻‍♂️ applying deployments"
	@kubectl apply -f infra/depl/traefik-depl.yaml

	@echo "🚀 starting development environment"
	@skaffold dev --status-check=false

# The --status-check flag in the skaffold dev command is used to control whether Skaffold performs a status check on deployed resources after they have been applied to the Kubernetes cluster. The status check helps ensure that all resources are in the "ready" state before considering the deployment as successful.
# Here's what it does:
# --status-check=true (default behavior): Skaffold will perform a status check on deployed resources. It will continuously check the status of resources in the Kubernetes cluster and wait until they are in a "ready" state before considering the deployment complete. This is useful to ensure that your application is fully available and running before you start working with it.
# --status-check=false: If you set --status-check=false, Skaffold won't perform the status check on deployed resources. It will consider the deployment complete as soon as it has applied the resources to the cluster. This can be useful if you want to skip the status check for some reason, such as for faster development iterations.

.PHONY: check-tools generate-cert-secret add-host create-env-secret dev all

# Default target to set up the development environment
all: check-tools generate-cert-secret add-host create-env-secret dev