nsc add operator --name tma --sys --generate-signing-key
nsc edit operator --require-signing-keys
nsc add account tma_account
nsc edit account tma_account --sk generate
nsc add user --account tma_account auth_service

# Export credentials to shared volume
nsc generate creds --account tma_account --name auth_service > /secrets/auth_service.creds

# Export memory resolver for server config to shared volume
nsc generate config --mem-resolver --sys-account SYS > /secrets/resolver.conf