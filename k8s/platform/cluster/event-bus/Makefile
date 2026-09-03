.DEFAULT_GOAL := help

.PHONY: help check deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Event Bus manifests.
	kubectl kustomize overlays/prod-eu >/dev/null
	kubectl kustomize overlays/local-edge >/dev/null

deploy: ## Deploy NATS JetStream and wait for readiness.
	kubectl apply -k overlays/local-edge
	kubectl rollout status -n nats statefulset/nats --timeout=300s
