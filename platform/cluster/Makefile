.PHONY: check

check:
	kubectl kustomize event-bus/overlays/local >/dev/null
	kubectl kustomize event-bus/overlays/prod-eu >/dev/null
	kubectl kustomize ingress/overlays/local >/dev/null
	kubectl kustomize ingress/overlays/prod-eu >/dev/null
	kubectl kustomize observability/overlays/local >/dev/null
	kubectl kustomize observability/overlays/prod-eu >/dev/null
