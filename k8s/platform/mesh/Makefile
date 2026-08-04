.DEFAULT_GOAL := help

.PHONY: help check deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate the inactive Mesh manifests.
	kubectl kustomize crds >/dev/null
	kubectl kustomize overlays/prod-eu >/dev/null

deploy: ## Deploy Linkerd locally with disposable certificates.
	kubectl apply -k crds
	linkerd check --pre
	linkerd install | kubectl apply -f -
	linkerd check
