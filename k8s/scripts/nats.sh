#!/usr/bin/env bash
set -euo pipefail

# 1. Create operator with system account (SYS)
nsc add operator --name TMA --sys --generate-signing-key
nsc edit operator --require-signing-keys

# 2. Add accounts (one for SYS, one for your app)
# skip nsc add account --name SYS if the system account was already created with nsc add operator --sys ... (it usually is).
# nsc add account --name SYS
nsc edit account SYS --sk generate

nsc add account --name TMA
nsc edit account TMA --sk generate

# 3. Enable JetStream (if needed) on your app account
nsc edit account TMA \
  --js-mem-storage -1 \
  --js-disk-storage -1 \
  --js-streams -1 \
  --js-consumer -1

# 4. Add users to accounts
nsc add user --account SYS --name sys
nsc add user --account TMA --name auth-api

# nsc generate creds --account SYS --name sys > sys.creds
nsc generate creds --account TMA --name auth-api > auth-api.creds

# These go on the nats instances
nsc describe operator --name TMA --raw
nsc describe account --name SYS --raw


# Test

kubectl port-forward -n nats pod/nats-depl-0 4222:4222

nsc list users
nsc generate creds --account SYS --name sys > sys.creds
nats --creds sys.creds -s nats://localhost:4222 server list
