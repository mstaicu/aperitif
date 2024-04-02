.DEFAULT_GOAL := run

# Default namespace for development environment
# NAMESPACE := potato

ENV_FILE_PATH  := $(PWD)/.env
HAS_NO_SECRETS := $(shell kubectl get secret dotenv 1>/dev/null 2>&1; echo $$?)
HAS_ENV_FILE   := $(shell test -e $(ENV_FILE_PATH); echo $$?)

cmd-exists-%:
	@hash $(*) > /dev/null 2>&1 || \
		(echo "ERROR: '$(*)' must be installed and available on your PATH."; exit 1)

# the prerequisites, setup, and run targets are marked as .PHONY,
# indicating that they are not associated with output files,
# and Make will execute them as needed without file-related checks
.PHONY: prerequisites setup run

prerequisites: cmd-exists-kubectl cmd-exists-skaffold
ifneq ($(HAS_ENV_FILE), 0)
	@echo "📁 Missing .env file at the root of the project"
endif

setup: prerequisites
ifneq ($(HAS_NO_SECRETS), 0)
	@echo "🔑 Creating k8s secrets from environment file"
	@kubectl create secret generic dotenv --from-env-file=.env
else
	@echo "🔑 Using existing k8s secrets"
# TODO: Add namespace to local development
#	@echo "🏝 Setting up the namespace"
#	@kubectl create namespace $(NAMESPACE)
endif

run: setup
	@echo "👷🏻‍♂️ Applying infra deployments"
	@kubectl apply -f infra/k8s-setup
# TODO: Add namespace to local development
#	@kubectl apply -n $(NAMESPACE) -f infra/k8s-setup
	@echo "🚀 Starting development environment"
# TODO: Add namespace to local development
#	@skaffold dev --status-check=false -n $(NAMESPACE)
# Run a pipeline in development mode
# https://skaffold.dev/docs/references/cli/#skaffold-dev
	@skaffold dev --status-check=false
# The --status-check flag in the skaffold dev command is used to control whether Skaffold performs a status check on deployed resources after they have been applied to the Kubernetes cluster. The status check helps ensure that all resources are in the "ready" state before considering the deployment as successful.
# Here's what it does:
# --status-check=true (default behavior): Skaffold will perform a status check on deployed resources. It will continuously check the status of resources in the Kubernetes cluster and wait until they are in a "ready" state before considering the deployment complete. This is useful to ensure that your application is fully available and running before you start working with it.
# --status-check=false: If you set --status-check=false, Skaffold won't perform the status check on deployed resources. It will consider the deployment complete as soon as it has applied the resources to the cluster. This can be useful if you want to skip the status check for some reason, such as for faster development iterations.