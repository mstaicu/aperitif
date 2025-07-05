#!/bin/sh

DOMAIN="${DOMAIN:-tma.com}"
TRAEFIK_NAMESPACE="${TRAEFIK_NAMESPACE:-traefik}"
SECRET_NAME="${SECRET_NAME:-traefik-tls}"

TMPDIR=$(mktemp -d -t traefik-certs)
trap "rm -rf $TMPDIR" EXIT

CERT_FILE="$TMPDIR/traefik-tls-cert.pem"
KEY_FILE="$TMPDIR/traefik-tls-key.pem"

grep -q "127.0.0.1 $DOMAIN" /etc/hosts || echo "127.0.0.1 $DOMAIN" | sudo tee -a /etc/hosts

mkcert -install

mkcert -cert-file "$CERT_FILE" -key-file "$KEY_FILE" "*.$DOMAIN" "$DOMAIN" localhost 127.0.0.1 ::1

kubectl create secret tls "$SECRET_NAME" \
  --cert="$CERT_FILE" \
  --key="$KEY_FILE" \
  --namespace "$TRAEFIK_NAMESPACE" \
  --dry-run=client \
  -o yaml | kubectl apply -f -