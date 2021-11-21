# .DEFAULT_GOAL := run

ENV_FILE_PATH  := $(PWD)/.env
HAS_NO_SECRETS := $(shell kubectl get secret dotenv 1>/dev/null 2>&1; echo $$?)
HAS_ENV_FILE   := $(shell test -e $(ENV_FILE_PATH); echo $$?)

cmd-exists-%:
	@hash $(*) > /dev/null 2>&1 || \
		(echo "ERROR: '$(*)' must be installed and available on your PATH."; exit 1)

prerequisites: cmd-exists-kubectl cmd-exists-skaffold
ifneq ($(HAS_ENV_FILE), 1)
	@echo "⚠️  Missing .env file at the root of the project"
endif

setup: prerequisites
ifneq ($(HAS_NO_SECRETS), 0)
	@kubectl create secret generic dotenv --from-env-file=.env
	@echo "🔑  Secrets created"
endif

run: setup
	skaffold dev