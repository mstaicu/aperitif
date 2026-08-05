.DEFAULT_GOAL := help

.PHONY: help check deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate the production Event Bus manifests.
	kubectl kustomize overlays/prod-eu >/dev/null

deploy: ## Deploy NATS JetStream and wait for readiness.
	kubectl apply -k overlays/ephemeral
	kubectl rollout status -n nats statefulset/nats --timeout=300s
