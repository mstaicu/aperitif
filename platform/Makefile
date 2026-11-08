.PHONY: check

check:
	kubectl kustomize event-bus/infra/overlays/local >/dev/null
	kubectl kustomize event-bus/infra/overlays/production >/dev/null
	kubectl kustomize ingress/infra/overlays/local >/dev/null
	kubectl kustomize ingress/infra/overlays/production >/dev/null
	kubectl kustomize observability/infra/overlays/local >/dev/null
	kubectl kustomize observability/infra/overlays/production >/dev/null

	npm --prefix outbox-relay ci
	npm --prefix outbox-relay run check
