.DEFAULT_GOAL := run

HAS_NO_SECRETS=$(shell kubectl get secret dotenv 1>/dev/null 2>&1; echo $$?)

cmd-exists-%:
	@hash $(*) > /dev/null 2>&1 || \
		(echo "ERROR: '$(*)' must be installed and available on your PATH."; exit 1)

prerequisites: cmd-exists-kubectl cmd-exists-skaffold

setup: prerequisites
ifeq ($(HAS_NO_SECRETS),1)
	kubectl create secret generic dotenv --from-env-file=.env
endif

run: setup
	skaffold dev