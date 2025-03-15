nsc add operator --name TMA --sys --generate-signing-key

nsc edit operator --require-signing-keys

nsc add account TMA

nsc edit account TMA --sk generate

# This is how you enable Jetstream for an account
nsc edit account TMA \
  --js-mem-storage -1 \
  --js-disk-storage -1 \
  --js-streams -1 \
  --js-consumer -1

nsc add user --account SYS sys
nsc add user --account TMA auth

# Export credentials to shared volume
nsc generate creds --account SYS --name sys > /secrets/sys.creds
nsc generate creds --account TMA --name auth > /secrets/auth.creds

# Export memory resolver for server config to shared volume
nsc generate config --mem-resolver --sys-account SYS > /secrets/resolver.conf