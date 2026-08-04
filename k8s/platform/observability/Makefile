.DEFAULT_GOAL := help

.PHONY: help check deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate the production Observability manifests.
	kubectl kustomize overlays/prod-eu >/dev/null

deploy: ## Deploy OpenTelemetry Collector and wait for readiness.
	skaffold run -m observability
	kubectl rollout status -n otel deploy/otel-collector --timeout=300s
	kubectl rollout status -n otel daemonset/otel-agent --timeout=300s
