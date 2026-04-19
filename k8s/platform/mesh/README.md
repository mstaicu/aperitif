helm repo add linkerd https://helm.linkerd.io/stable
helm repo update

helm search repo linkerd --versions

helm template linkerd-crd linkerd/linkerd-crds \
 --version 1.8.0 \
 --set installGatewayAPI=true > linkerd-crd.yaml

helm template linkerd-control-plane linkerd/linkerd-control-plane \
 --version 1.16.11 \
 --set disableHeartBeat=true \
 --set identity.externalCA=true \
 --set identity.issuer.scheme=kubernetes.io/tls \
 --set proxyInit.runAsRoot=true \
 -n linkerd > linkerd-depl.yaml

The rendered base assumes external identity material.

- `platform/mesh/base` contains the shared Linkerd control plane manifests
- `platform/mesh/overlays/local` provides:
  - `linkerd-identity-trust-roots` ConfigMap
  - `linkerd-identity-issuer` Secret
  - `linkerd-webhook-trust-roots` ConfigMap
  - `linkerd-*-k8s-tls` webhook Secrets
- `platform/mesh/overlays/live` provides:
  - `linkerd-identity-trust-roots` ConfigMap
  - `linkerd-identity-issuer` Secret
  - `linkerd-webhook-trust-roots` ConfigMap
  - `linkerd-*-k8s-tls` webhook Secrets

Both overlays follow the same Helm-compatible model.
The only difference between local and live should be the certificate material.

Webhook TLS is managed separately from Linkerd identity TLS.

- `linkerd-identity-trust-roots` is consumed by Linkerd identity/proxies
- `linkerd-webhook-trust-roots` is the overlay source of truth for the webhook CA
- Kubernetes API server trusts the webhook CA via the `caBundle` embedded in:
  - `linkerd-proxy-injector-webhook-config`
  - `linkerd-policy-validator-webhook-config`
  - `linkerd-sp-validator-webhook-config`

To rotate webhook TLS later:

- you need `openssl` and `sops`
- you do not need the `age` CLI directly if `sops` can read `SOPS_AGE_KEY_FILE`

```sh
export SOPS_AGE_KEY_FILE=/Users/mircea/.config/sops/age/keys.txt

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

for env in local live; do
  envdir="platform/mesh/overlays/$env"
  workdir="$tmp/$env"
  mkdir -p "$workdir"

  openssl ecparam -name prime256v1 -genkey -noout -out "$workdir/webhook-ca.key"
  openssl req -x509 -new -sha256 -days 3650 \
    -key "$workdir/webhook-ca.key" \
    -subj "/CN=linkerd-webhooks.$env.linkerd.cluster.local" \
    -out "$workdir/webhook-ca.crt"

  cat > "$envdir/linkerd-webhook-trust-roots.yaml" <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: linkerd-webhook-trust-roots
data:
  ca-bundle.crt: |
$(sed 's/^/    /' "$workdir/webhook-ca.crt")
EOF

  bundle_b64="$(base64 < "$workdir/webhook-ca.crt" | tr -d '\n')"

  cat > "$envdir/linkerd-webhook-ca-bundle-patches.yaml" <<EOF
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: linkerd-proxy-injector-webhook-config
webhooks:
  - name: linkerd-proxy-injector.linkerd.io
    clientConfig:
      caBundle: $bundle_b64
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: linkerd-policy-validator-webhook-config
webhooks:
  - name: linkerd-policy-validator.linkerd.io
    clientConfig:
      caBundle: $bundle_b64
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: linkerd-sp-validator-webhook-config
webhooks:
  - name: linkerd-sp-validator.linkerd.io
    clientConfig:
      caBundle: $bundle_b64
EOF

  for svc in proxy-injector policy-validator sp-validator; do
    secret_name="linkerd-$svc-k8s-tls"
    dns1="linkerd-$svc.linkerd.svc"
    dns2="linkerd-$svc.linkerd.svc.cluster.local"

    openssl ecparam -name prime256v1 -genkey -noout -out "$workdir/$svc.key"
    openssl req -new \
      -key "$workdir/$svc.key" \
      -subj "/CN=$dns1" \
      -out "$workdir/$svc.csr"

    cat > "$workdir/$svc.ext" <<EOF
basicConstraints=critical,CA:FALSE
extendedKeyUsage=serverAuth
subjectAltName=DNS:$dns1,DNS:$dns2
EOF

    openssl x509 -req -sha256 -days 825 \
      -in "$workdir/$svc.csr" \
      -CA "$workdir/webhook-ca.crt" \
      -CAkey "$workdir/webhook-ca.key" \
      -CAcreateserial \
      -extfile "$workdir/$svc.ext" \
      -out "$workdir/$svc.crt"

    crt_b64="$(base64 < "$workdir/$svc.crt" | tr -d '\n')"
    key_b64="$(base64 < "$workdir/$svc.key" | tr -d '\n')"
    ca_b64="$(base64 < "$workdir/webhook-ca.crt" | tr -d '\n')"

    cat > "$workdir/$secret_name.yaml" <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: $secret_name
type: kubernetes.io/tls
data:
  tls.crt: $crt_b64
  tls.key: $key_b64
  ca.crt: $ca_b64
EOF

    sops -e --encrypted-regex '^(data|stringData)$' "$workdir/$secret_name.yaml" > "$envdir/$secret_name.yaml"
  done
done
```
