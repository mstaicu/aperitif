.DEFAULT_GOAL := help

.PHONY: help check deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate Observability manifests.
	kubectl kustomize overlays/prod-eu >/dev/null
	kustomize build --enable-alpha-plugins --enable-exec overlays/local >/dev/null

deploy: ## Deploy observability and wait for readiness.
	kustomize build --enable-alpha-plugins --enable-exec overlays/local | kubectl apply -f -
	kubectl rollout status -n otel statefulset/openobserve --timeout=300s
	kubectl rollout status -n otel deploy/collector --timeout=300s
	kubectl rollout status -n otel daemonset/agent --timeout=300s
