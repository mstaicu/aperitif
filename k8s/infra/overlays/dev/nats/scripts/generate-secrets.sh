nsc add operator --name tma --sys --generate-signing-key
nsc edit operator --require-signing-keys

nsc add account tma

nsc edit account tma --sk generate
nsc edit account tma --js-enable -1

nsc add user --account tma nack
nsc add user --account tma auth

nsc edit user --account tma -n nack --allow-pub "$JS.API.>"

# Export credentials to shared volume
nsc generate creds --account tma --name nack > /secrets/nack.creds
nsc generate creds --account tma --name auth > /secrets/auth.creds

# Export memory resolver for server config to shared volume
nsc generate config --mem-resolver --sys-account SYS > /secrets/resolver.conf