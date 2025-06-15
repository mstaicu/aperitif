kubectl create secret generic nats-resolver \
  --from-file=/secrets/resolver.conf \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic nats-auth-creds \
  --from-file=/secrets/auth.creds \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic nats-sys-creds \
  --from-file=/secrets/sys.creds \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -