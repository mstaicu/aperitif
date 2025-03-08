kubectl create secret generic auth-secrets \
  --from-file=ACCESS_TOKEN_PRIVATE_KEY=/secrets/access_token_private_key.pem \
  --from-file=ACCESS_TOKEN_PUBLIC_KEY=/secrets/access_token_public_key.pem \
  --from-file=REFRESH_TOKEN_SECRET=/secrets/refresh_token_secret.txt \
  -n $NAMESPACE \
  1> /dev/null