.DEFAULT_GOAL := help

.PHONY: help check

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate the inactive Mesh bases.
	kubectl kustomize crds >/dev/null
	kubectl kustomize base >/dev/null
