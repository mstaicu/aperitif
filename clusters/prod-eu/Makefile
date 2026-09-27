.PHONY: check bootstrap

check:
	kubectl kustomize . >/dev/null

bootstrap:
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
		--path=clusters/prod-eu \
		--personal \
		--components=source-controller,kustomize-controller \
		--components-extra=image-reflector-controller,image-automation-controller \
		--version=v2.9.4 \
		--read-write-key
