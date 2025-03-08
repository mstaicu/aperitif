nsc add operator --name TMA --sys --generate-signing-key
nsc edit operator --require-signing-keys

nsc add account TMA

nsc edit account TMA --sk generate
nsc edit account TMA --js-enable 3

# nsc add user --account TMA nack
nsc add user --account TMA auth

# nsc edit user --account TMA -n nack \
#   --allow-pub "\$JS.API.>" \
#   --allow-sub "\$JS.API.>"

# nsc edit user --account TMA -n nack \
#   --allow-pub "_INBOX.>" \
#   --allow-sub "_INBOX.>"

# Export credentials to shared volume
# nsc generate creds --account TMA --name nack > /secrets/nack.creds
nsc generate creds --account TMA --name auth > /secrets/auth.creds

# Export memory resolver for server config to shared volume
nsc generate config --mem-resolver --sys-account SYS > /secrets/resolver.conf