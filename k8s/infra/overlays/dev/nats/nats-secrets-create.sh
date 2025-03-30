kubectl create secret generic nats-resolver-secret \
  --from-file=resolver.conf=/secrets/resolver.conf \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic nats-auth-creds-secret \
  --from-file=auth.creds=/secrets/auth.creds \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic nats-sys-creds-secret \
  --from-file=sys.creds=/secrets/sys.creds \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -