if ! kubectl get secret nats-resolver -n $NAMESPACE > /dev/null 2>&1; then
  kubectl create secret generic nats-resolver \
    --from-file=resolver.conf=/secrets/resolver.conf \
    -n $NAMESPACE \
    1> /dev/null
fi

#
# Here's the magic
#
# We mount an empty file secret called 'nack-creds' to the nack controller
# after which we create the actual secret, and remount it in the pod by leveraging
# the k8s runtime to delete the secret and recreate it, k8s will remount it
# if the secret is not 'optional' or using a subPath
#
if ! kubectl get secret nack-creds -n $NAMESPACE > /dev/null 2>&1; then
  kubectl create secret generic nack-creds \
    --from-file=nack.creds=/secrets/nack.creds \
    -n $NAMESPACE \
    1> /dev/null
else
  kubectl delete secret nack-creds -n $NAMESPACE
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