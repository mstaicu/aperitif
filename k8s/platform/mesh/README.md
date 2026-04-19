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
- `platform/mesh/overlays/live` provides:
  - `linkerd-identity-trust-roots` ConfigMap
  - `linkerd-identity-issuer` Secret

Both overlays follow the same Helm-compatible model.
The only difference between local and live should be the certificate material.
