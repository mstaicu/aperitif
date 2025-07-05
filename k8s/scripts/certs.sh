#!/bin/sh

# ---- Install mkcert if not already installed ----
# Mac:    brew install mkcert
# Linux:  sudo apt install libnss3-tools && \
#         curl -JLO https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-$(uname -s)-$(uname -m)
#         chmod +x mkcert-*-* && sudo mv mkcert-*-* /usr/local/bin/mkcert

# ---- Initialize mkcert and install its root CA into system trust store ----
mkcert -install

# ---- Get the location where mkcert stores its root CA and key ----
CAROOT=$(mkcert -CAROOT)

# ---- Create a new temporary directory for this run's PKI files ----
TMPDIR=$(mktemp -d -t tma-certs)
echo "Using temp dir for certificates: $TMPDIR"

# ---- Copy only the mkcert root CA cert and key into the temp directory ----
cp "$CAROOT/rootCA.pem" "$TMPDIR/root_ca.crt"
cp "$CAROOT/rootCA-key.pem" "$TMPDIR/root_ca_key.pem"

cd "$TMPDIR"

# ---- Use step CLI to generate an intermediate CA, signed by the mkcert root ----
#  --profile=profile
#     The certificate profile sets various certificate details such as
#     certificate use and expiration. The default profile is 'leaf' which is
#     suitable for a client or server using TLS.
step certificate create "mkcert intermediate ca" intermediate_ca.crt intermediate_ca_key.pem \
  --profile intermediate-ca \
  --ca ./root_ca.crt \
  --ca-key ./root_ca_key.pem \
  --no-password \
  --insecure \
  --not-after=876000h

#
# step certificate inspect intermediate_ca.crt --format json | jq -r '.validity.start'
# step certificate inspect intermediate_ca.crt --format json | jq -r '.validity.end'

# ----- Secrets --------

if ! kubectl version --request-timeout=5s &>/dev/null; then
  echo "kubectl not configured or cluster not running"
  exit 1
fi

# LINKERD_NAMESPACE="linkerd"

# # # Create the linkerd-identity-issuer secret (intermediate CA + key + root CA)
# kubectl -n "$LINKERD_NAMESPACE" create secret generic linkerd-identity-issuer \
#   --from-file=tls.crt=intermediate_ca.crt \
#   --from-file=tls.key=intermediate_ca_key.pem \
#   --from-file=ca.crt=root_ca.crt \
#   --dry-run=client -o yaml | kubectl apply -f -

# # Create the trust roots configmap (just root CA)
# kubectl -n "$LINKERD_NAMESPACE" create configmap linkerd-identity-trust-roots \
#   --from-file=ca-bundle.crt=root_ca.crt \
#   --dry-run=client -o yaml | kubectl apply -f -

STEP_CA_NAMESPACE="step-ca"

kubectl -n "$STEP_CA_NAMESPACE" create secret generic step-ca-secrets \
  --from-file=intermediate_ca.crt=intermediate_ca.crt \
  --from-file=intermediate_ca_key.pem=intermediate_ca_key.pem \
  --from-file=root_ca.crt=root_ca.crt \
  --from-file=root_ca_key.pem=root_ca_key.pem \
  --from-literal=password=\
  --dry-run=client -o yaml | kubectl apply -f -

# ---- clean up temp files when done ----

cd ~
rm -rf "$TMPDIR"
