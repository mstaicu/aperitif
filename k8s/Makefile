DOMAIN = tma.com
DOTENV_SECRET_NAME = dotenv
ENV_FILE = .env
NAMESPACE = my-namespace

define check_command
  @command -v $(1) >/dev/null 2>&1 || { echo >&2 "$(1) is not installed. Please install it and try again."; exit 1; }
endef

check-tools:
	$(call check_command,mkcert)
	$(call check_command,kubectl)
	$(call check_command,skaffold)
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

create-env-secret:
	@echo "🔐 checking if Kubernetes secret/$(DOTENV_SECRET_NAME) exists..."
	@if kubectl get secret $(DOTENV_SECRET_NAME) >/dev/null 2>&1; then \
		echo "🔐 secret/$(DOTENV_SECRET_NAME) exists, skipping creation"; \
	else \
		echo "🔐 secret/$(DOTENV_SECRET_NAME) does not exist, creating it from $(ENV_FILE)..."; \
		kubectl create secret generic $(DOTENV_SECRET_NAME) --from-env-file=$(ENV_FILE); \
	fi

dev:
	@echo "🚀 starting development environment"
	@skaffold dev --cache-artifacts=false --no-prune=false --no-prune-children=false

.PHONY: check-tools generate-cert-secret add-host create-env-secret dev all

all: check-tools generate-cert-secret add-host create-env-secret dev