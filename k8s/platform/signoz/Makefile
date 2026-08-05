.DEFAULT_GOAL := help

.PHONY: help check deploy-crds deploy

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate the generated SigNoz and ClickHouse manifests.
	kubectl kustomize crds >/dev/null
	kubectl kustomize overlays/prod-eu >/dev/null

deploy-crds:
	kubectl apply -k crds
	kubectl wait --for=condition=Established --timeout=60s \
		crd/clickhouseinstallations.clickhouse.altinity.com \
		crd/clickhouseinstallationtemplates.clickhouse.altinity.com \
		crd/clickhouseoperatorconfigurations.clickhouse.altinity.com \
		crd/clickhousekeeperinstallations.clickhouse-keeper.altinity.com

deploy: deploy-crds ## Deploy SigNoz locally.
	kubectl apply -k overlays/ephemeral
