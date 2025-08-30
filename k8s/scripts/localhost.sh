#!/bin/sh

DOMAIN="${DOMAIN:-tma.com}"
TRAEFIK_NAMESPACE="${TRAEFIK_NAMESPACE:-traefik}"
TRAEFIK_TLS_SECRET="${TRAEFIK_TLS_SECRET:-traefik-tls}"

TMPDIR=$(mktemp -d -t traefik-certs)
trap "rm -rf $TMPDIR" EXIT

CERT_FILE="$TMPDIR/tls.crt.pem"
KEY_FILE="$TMPDIR/tls.key.pem"

grep -q "127.0.0.1 $DOMAIN" /etc/hosts || echo "127.0.0.1 $DOMAIN" | sudo tee -a /etc/hosts

mkcert -install
mkcert -cert-file "$CERT_FILE" -key-file "$KEY_FILE" "*.$DOMAIN" "$DOMAIN" localhost 127.0.0.1 ::1

kubectl create secret tls "$TRAEFIK_TLS_SECRET" \
  --cert="$CERT_FILE" \
  --key="$KEY_FILE" \
  --namespace "$TRAEFIK_NAMESPACE" \
  --dry-run=client \
  --output yaml | kubectl apply -f -

# kubectl create secret generic linkerd-identity-issuer \
#   --from-file=tls.crt=intermediate_ca.crt \
#   --from-file=tls.key=intermediate_ca_key.pem \
#   --from-file=ca.crt=root_ca.crt \
#   --dry-run=client -o yaml > linkerd-identity-issuer.yaml

# kubectl create configmap linkerd-identity-trust-roots \
#   --from-file=ca-bundle.crt=root_ca.crt \
#   --dry-run=client -o yaml > linkerd-identity-trust-roots.yaml
