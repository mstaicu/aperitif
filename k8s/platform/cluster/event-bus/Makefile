.PHONY: check up down

check:
	kubectl kustomize overlays/prod-eu >/dev/null
	kubectl kustomize overlays/local >/dev/null

up:
	kubectl apply -k overlays/local
	kubectl rollout status -n nats statefulset/nats --timeout=300s

down:
	kubectl delete -k overlays/local --ignore-not-found=true
