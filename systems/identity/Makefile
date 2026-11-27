.PHONY: up down

KUBECTL ?= kubectl

up:
	$(KUBECTL) apply -f namespace.yaml
	$(KUBECTL) apply -k postgres/kustomize/overlays/local
	$(KUBECTL) rollout status --namespace=identity deployment/postgres --timeout=300s

	$(KUBECTL) create configmap migration-sql --namespace=identity --from-file=migrations/sql --dry-run=client -o yaml \
		| $(KUBECTL) apply --server-side -f -

	$(KUBECTL) delete --namespace=identity --ignore-not-found job/migrations
	$(KUBECTL) apply -k migrations/kustomize/overlays/local
	$(KUBECTL) wait --namespace=identity --for=condition=complete --timeout=300s job/migrations

down:
	$(KUBECTL) delete --ignore-not-found -f namespace.yaml
