# TODO: read .env file in makefile process

DOMAIN=tma.com
DOTENV_SECRET_NAME = dotenv
ENV_FILE = .env

.PHONY: check-tools generate-cert-secret add-host create-env-secret dev debug all

all: dev

define check_command
  @if command -v $(1) >/dev/null 2>&1; then \
    echo "✅ $(1) is already installed"; \
  else \
    echo "🔧 $(1) is not installed. Installing $(1) via Homebrew..."; \
    brew install $(1); \
  fi
endef

define check_homebrew
  @if ! command -v brew >/dev/null 2>&1; then \
    echo "🍺 Homebrew is not installed. Installing Homebrew..."; \
    /bin/bash -c "$$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; \
  else \
    echo "🍺 Homebrew is already installed"; \
  fi
endef

check-tools:
  $(call check_homebrew)

  $(call check_command,mkcert)
  $(call check_command,kubectl)
  $(call check_command,skaffold)
  $(call check_command,helm)

  @echo "✅ All required tools are installed"

generate-cert-secret: check-tools
  @echo "🪪 installing mkcert certificate authority"
  @mkcert -install

  @echo "🔍 checking if secret/certs-secret exists"
  @if kubectl get secret certs-secret >/dev/null 2>&1; then \
    echo "🔐 secret/certs-secret already exists, skipping creation"; \
  else \
    echo "🪪 generating certificate and key for domain $(DOMAIN) using mkcert"; \
    cert_file=$$(mktemp) && \
    key_file=$$(mktemp) && \
    mkcert -cert-file $$cert_file -key-file $$key_file $(DOMAIN) && \
    kubectl create secret tls certs-secret --cert=$$cert_file --key=$$key_file && \
    rm $$cert_file $$key_file; \
  fi

add-host: generate-cert-secret
  @echo "🔍 checking /etc/hosts for existing entry"

  #
  # ⚠️ The DOMAIN comes from the .env file
  #
  @if ! grep -q "^127.0.0.1 $(DOMAIN)$$" /etc/hosts; then \
    echo "127.0.0.1 $(DOMAIN)" | sudo tee -a /etc/hosts > /dev/null; \
    echo "📍 127.0.0.1 $(DOMAIN) added to /etc/hosts"; \
  else \
    echo "📍 127.0.0.1 $(DOMAIN) already exists in /etc/hosts"; \
  fi

create-env-secret: add-host
  @echo "🔍 checking if Kubernetes secret/$(DOTENV_SECRET_NAME) exists..."
  @if kubectl get secret $(DOTENV_SECRET_NAME) >/dev/null 2>&1; then \
    echo "🔐 secret/$(DOTENV_SECRET_NAME) exists, skipping creation"; \
  else \
    echo "🔐 secret/$(DOTENV_SECRET_NAME) does not exist, creating it from $(ENV_FILE)..."; \
    kubectl create secret generic $(DOTENV_SECRET_NAME) --from-env-file=$(ENV_FILE); \
  fi

dev: create-env-secret
  @echo "🚀 starting development environment"
  @skaffold dev --cache-artifacts=false --no-prune=false --no-prune-children=false

debug: create-env-secret
  @echo "🚀 starting debug environment"
  @skaffold debug --cache-artifacts=false --no-prune=false --no-prune-children=false