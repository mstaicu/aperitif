.PHONY: check up down

check:
	kubectl kustomize overlays/prod-eu >/dev/null
	kubectl kustomize overlays/local >/dev/null

up:
	kubectl apply -k overlays/local
	kubectl rollout status -n otel statefulset/openobserve --timeout=300s
	kubectl rollout status -n otel deploy/collector --timeout=300s
	kubectl rollout status -n otel daemonset/agent --timeout=300s

down:
	kubectl delete -k overlays/local --ignore-not-found=true
