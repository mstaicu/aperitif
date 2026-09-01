.DEFAULT_GOAL := help

.PHONY: help check

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate platform runtime workloads.
	cd outbox-relay && npm ci
	cd outbox-relay && npm exec -- eslint .
	cd outbox-relay && npm exec -- tsc -p jsconfig.json --noEmit
	cd outbox-relay && npm test
