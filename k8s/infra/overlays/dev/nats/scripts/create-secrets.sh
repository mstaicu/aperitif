if ! kubectl get secret nats-resolver -n $NAMESPACE > /dev/null 2>&1; then
  kubectl create secret generic nats-resolver \
    --from-file=resolver.conf=/secrets/resolver.conf \
    -n $NAMESPACE \
    1> /dev/null
fi

if ! kubectl get secret nack-creds -n $NAMESPACE > /dev/null 2>&1; then
  kubectl create secret generic nack-creds \
    --from-file=nack.creds=/secrets/nack.creds \
    -n $NAMESPACE \
    1> /dev/null
fi

if ! kubectl get secret nats-auth-creds -n $NAMESPACE > /dev/null 2>&1; then
  kubectl create secret generic nats-auth-creds \
    --from-file=auth.creds=/secrets/auth.creds \
    -n $NAMESPACE \
    1> /dev/null
fi