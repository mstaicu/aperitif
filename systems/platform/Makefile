.PHONY: check

check:
	kubectl kustomize nats/kustomize/overlays/local >/dev/null
	kubectl kustomize nats/kustomize/overlays/production >/dev/null
	kubectl kustomize traefik/kustomize/overlays/local >/dev/null
	kubectl kustomize traefik/kustomize/overlays/production >/dev/null
	kubectl kustomize observability/kustomize/overlays/local >/dev/null
	kubectl kustomize observability/kustomize/overlays/production >/dev/null
