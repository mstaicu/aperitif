.PHONY: check

check:
	kubectl kustomize nats/kustomize/overlays/local >/dev/null
	kubectl kustomize nats/kustomize/overlays/production >/dev/null
	kubectl kustomize traefik/kustomize/overlays/local >/dev/null
	kubectl kustomize traefik/kustomize/overlays/production >/dev/null
	kubectl kustomize otel-collector/kustomize/overlays/local >/dev/null
	kubectl kustomize otel-collector/kustomize/overlays/production >/dev/null
	kubectl kustomize openobserve/kustomize/overlays/local >/dev/null
	kubectl kustomize openobserve/kustomize/overlays/production >/dev/null
