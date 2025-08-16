#!/bin/bash

set -euo pipefail

echo "installing cert-manager"

kubectl apply -k infra/cert-manager/base

echo "waiting for cert-manager components to become available"

cmctl check api --wait=2m

echo "verifying cert-manager with test certificate"

kubectl create ns cert-manager-test || true

cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: test-cert
  namespace: cert-manager-test
spec:
  dnsNames:
    - example.com
  secretName: test-cert-tls
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
  privateKey: {}
EOF

kubectl wait certificate/test-cert \
  --for=condition=Ready \
  --timeout=180s \
  -n cert-manager-test

echo "cleaning up test resources"

kubectl delete namespace cert-manager-test --wait=true

echo "cert-manager is installed and working"

echo "creating linkerds trust anchor and identity issuer"

kubectl apply -k infra/cert-manager/overlays/dev
kubectl wait certificate/linkerd-trust-anchor \
  --for=condition=Ready \
  --timeout=180s \
  -n cert-manager

echo "installing trust manager"

kubectl apply -k infra/trust-manager/base

kubectl wait deployment/trust-manager \
  --for=condition=Available \
  --timeout=180s \
  -n cert-manager

kubectl wait certificate/trust-manager \
  --for=condition=Ready \
  --timeout=180s \
  -n cert-manager

echo "installing linkerd"

kubectl apply -k infra/linkerd/overlays/dev
linkerd check --wait=5m
# linkerd viz install | kubectl apply -f -

echo "installing traefik"

kubectl apply -k infra/traefik/base
kubectl apply -k infra/traefik/overlays/dev

DOMAIN="tma.com"
TRAEFIK_NAMESPACE="traefik"
TRAEFIK_TLS_SECRET="traefik-tls"

TMPDIR=$(mktemp -d -t traefik-certs)

trap "rm -rf $TMPDIR" EXIT

CERT_FILE="$TMPDIR/tls.crt.pem"
KEY_FILE="$TMPDIR/tls.key.pem"

mkcert -install
mkcert -cert-file "$CERT_FILE" -key-file "$KEY_FILE" "*.$DOMAIN" "$DOMAIN" localhost 127.0.0.1 ::1

kubectl create secret tls "$TRAEFIK_TLS_SECRET" \
  --cert="$CERT_FILE" \
  --key="$KEY_FILE" \
  --namespace "$TRAEFIK_NAMESPACE" \
  --dry-run=client \
  --output yaml | kubectl apply -f -

grep -q "127.0.0.1 $DOMAIN" /etc/hosts || echo "127.0.0.1 $DOMAIN" | sudo tee -a /etc/hosts