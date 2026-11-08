.PHONY: check

check:
	kubectl kustomize event-bus/overlays/local >/dev/null
	kubectl kustomize event-bus/overlays/production >/dev/null
	kubectl kustomize ingress/overlays/local >/dev/null
	kubectl kustomize ingress/overlays/production >/dev/null
	kubectl kustomize observability/overlays/local >/dev/null
	kubectl kustomize observability/overlays/production >/dev/null
