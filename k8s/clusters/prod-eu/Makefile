.DEFAULT_GOAL := help

.PHONY: help check bootstrap

help: ## Show available targets.
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check: ## Validate the cluster inventory and every Flux reconciliation path.
	kubectl kustomize . >/dev/null
	@for path in $$(sed -n 's/^  path: //p' platform.yaml domains/*.yaml); do \
		kubectl kustomize "../..$${path#./k8s}" >/dev/null; \
	done

bootstrap: ## Bootstrap Flux and create its required cluster-local secrets.
	@test -n "$$GITHUB_TOKEN" || { echo "GITHUB_TOKEN is required"; exit 1; }
	@test -n "$$SOPS_AGE_KEY_FILE" || { echo "SOPS_AGE_KEY_FILE is required"; exit 1; }
	@test -f "$$SOPS_AGE_KEY_FILE" || { echo "SOPS_AGE_KEY_FILE does not exist: $$SOPS_AGE_KEY_FILE"; exit 1; }

	kubectl create namespace flux-system --dry-run=client -o yaml | kubectl apply -f -

	kubectl create secret generic sops-age \
		-n flux-system \
		--from-file=age.agekey="$$SOPS_AGE_KEY_FILE" \
		--dry-run=client -o yaml | kubectl apply -f -

	flux bootstrap github \
		--owner=mstaicu \
		--repository=aperitif \
		--branch=master \
		--path=k8s/clusters/prod-eu \
		--personal \
		--components=source-controller,kustomize-controller
