if ! kubectl get secret nats-resolver-secret -n $NAMESPACE > /dev/null 2>&1; then
  kubectl create secret generic nats-resolver-secret \
    --from-file=resolver.conf=/secrets/resolver.conf \
    -n $NAMESPACE \
    1> /dev/null
fi

if ! kubectl get secret nats-auth-creds-secret -n $NAMESPACE > /dev/null 2>&1; then
  kubectl create secret generic nats-auth-creds-secret \
    --from-file=auth.creds=/secrets/auth.creds \
    -n $NAMESPACE \
    1> /dev/null
fi

if ! kubectl get secret nats-sys-creds-secret -n $NAMESPACE > /dev/null 2>&1; then
  kubectl create secret generic nats-sys-creds-secret \
    --from-file=sys.creds=/secrets/sys.creds \
    -n $NAMESPACE \
    1> /dev/null
fi