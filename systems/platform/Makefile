.PHONY: check

check:
	kubectl kustomize infra/event-bus/overlays/local >/dev/null
	kubectl kustomize infra/event-bus/overlays/production >/dev/null
	kubectl kustomize infra/ingress/overlays/local >/dev/null
	kubectl kustomize infra/ingress/overlays/production >/dev/null
	kubectl kustomize infra/observability/overlays/local >/dev/null
	kubectl kustomize infra/observability/overlays/production >/dev/null
