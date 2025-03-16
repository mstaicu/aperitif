# This is created by the nats kustomization.yaml so that we don't get a mount error
if kubectl get secret nats-resolver-secret -n $NAMESPACE > /dev/null 2>&1; then
  kubectl delete secret nats-resolver-secret -n $NAMESPACE
fi

kubectl create secret generic nats-resolver-secret \
  --from-file=resolver.conf=/secrets/resolver.conf \
  -n $NAMESPACE

# This is created by the auth kustomization.yaml so that we don't get a mount error
if kubectl get secret nats-auth-creds-secret -n $NAMESPACE > /dev/null 2>&1; then
  kubectl delete secret nats-auth-creds-secret -n $NAMESPACE
fi

kubectl create secret generic nats-auth-creds-secret \
  --from-file=auth.creds=/secrets/auth.creds \
  -n $NAMESPACE

if kubectl get secret nats-sys-creds-secret -n $NAMESPACE > /dev/null 2>&1; then
  kubectl delete secret nats-sys-creds-secret -n $NAMESPACE
fi

kubectl create secret generic nats-sys-creds-secret \
  --from-file=sys.creds=/secrets/sys.creds \
  -n $NAMESPACE