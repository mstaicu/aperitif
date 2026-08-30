.DEFAULT_GOAL := help

.PHONY: help check

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate the Outbox Relay runtime.
	npm ci
	npm exec -- eslint .
	npm exec -- tsc -p jsconfig.json --noEmit
	npm test
