if ! kubectl get secret nats-resolver-secret -n $NAMESPACE > /dev/null 2>&1; then
  kubectl create secret generic nats-resolver-secret \
    --from-file=resolver.conf=/secrets/resolver.conf \
    -n $NAMESPACE \
    1> /dev/null
fi

if ! kubectl get secret nats-auth-creds-secret -n $NAMESPACE > /dev/null 2>&1; then
  kubectl create secret generic nats-auth-creds-secret \
    --from-file=nats-auth-creds=/secrets/auth_service.creds \
    -n $NAMESPACE \
    1> /dev/null
fi