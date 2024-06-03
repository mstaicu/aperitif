.DEFAULT_GOAL := run

DOMAIN = tma.com

generate-cert:
	@echo "Installing mkcert CA"

	@mkcert -install

	@echo "Generating certificate and key using mkcert"

	@cert_file=$$(mktemp) && \
	key_file=$$(mktemp) && \
	mkcert -cert-file $$cert_file -key-file $$key_file $(DOMAIN) && \
	rm $$cert_file $$key_file

# kubectl create secret tls certs-secret --cert=$$cert_file --key=$$key_file && \

add-host: generate-cert
	@echo "Checking /etc/hosts for existing entry"

	@if ! grep -q "^127.0.0.1 $(DOMAIN)$$" /etc/hosts; then \
		echo "127.0.0.1 $(DOMAIN)" | sudo tee -a /etc/hosts > /dev/null; \
	else \
		echo "127.0.0.1 $(DOMAIN) already exists in /etc/hosts"; \
	fi

run: add-host
	@echo "👷🏻‍♂️ Applying config maps"
	@kubectl apply -f infra/cm

	@echo "👷🏻‍♂️ Applying custom resource definitions"
	@kubectl apply -f infra/crds

	@echo "👷🏻‍♂️ Applying deployments"
	@kubectl apply -f infra/depls

	@echo "🚀 Starting development environment"
	@skaffold dev --status-check=false

# The --status-check flag in the skaffold dev command is used to control whether Skaffold performs a status check on deployed resources after they have been applied to the Kubernetes cluster. The status check helps ensure that all resources are in the "ready" state before considering the deployment as successful.
# Here's what it does:
# --status-check=true (default behavior): Skaffold will perform a status check on deployed resources. It will continuously check the status of resources in the Kubernetes cluster and wait until they are in a "ready" state before considering the deployment complete. This is useful to ensure that your application is fully available and running before you start working with it.
# --status-check=false: If you set --status-check=false, Skaffold won't perform the status check on deployed resources. It will consider the deployment complete as soon as it has applied the resources to the cluster. This can be useful if you want to skip the status check for some reason, such as for faster development iterations.

.PHONY: run add-host-entry generate-cert