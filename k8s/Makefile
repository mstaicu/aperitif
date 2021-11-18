ifneq (,$(wildcard ./.env))
	include .env
	export
endif

prerequisites:
	@echo "Checking runtime dependencies"
	if ! [ -x "$(skaffold version)" ]; then
		echo 'Error: skaffold is not installed or the current user has no execute rights for it' >&2
		exit 1
	fi

setup:
	@echo "Setup development environment"
	kubectl create secret generic jwt-secret

run:
	@echo "Run the cluster"
	skaffold dev