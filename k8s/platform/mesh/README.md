# Mesh

Linkerd is prepared but inactive. Nothing in `clusters/prod-eu` imports it.

| Source | Version |
| --- | --- |
| Linkerd CLI render | `edge-26.7.2` |
| Gateway API standard CRDs | `v1.2.1` |

The manifests are rendered from the Linkerd CLI. Helm and KSOPS are not used.

## Layout

```text
crds/
  gateway-api.yaml       upstream Gateway API CRDs
  linkerd.yaml           Linkerd CRDs

overlays/prod-eu/
  linkerd-control-plane.yaml          non-secret CLI render
  linkerd-identity-trust-roots.yaml    public identity trust bundle
  linkerd-identity-issuer.yaml         SOPS-encrypted issuer certificate and key
  linkerd-*-k8s-tls.yaml               SOPS-encrypted webhook certificates
```

## Local

Install the `edge-26.7.2` Linkerd CLI, then run:

```bash
make deploy
```

This applies the pinned CRDs and lets `linkerd install` generate disposable
identity and webhook certificates for the current cluster.

## Production render

Decrypt the production certificate inputs to temporary files, then render with
the pinned CLI:

```bash
linkerd install \
  --set installGatewayAPI=false \
  --identity-trust-anchors-file trust-roots.pem \
  --identity-issuer-certificate-file issuer.crt \
  --identity-issuer-key-file issuer.key \
  --set proxyInjector.externalSecret=true \
  --set-file proxyInjector.caBundle=webhook-ca.crt \
  --set policyValidator.externalSecret=true \
  --set-file policyValidator.caBundle=webhook-ca.crt \
  --set profileValidator.externalSecret=true \
  --set-file profileValidator.caBundle=webhook-ca.crt \
  > /tmp/linkerd-install.yaml
```

Keep only the non-secret control-plane resources in
`linkerd-control-plane.yaml`. The namespace, identity resources and encrypted
webhook Secrets remain separate. Never commit the decrypted temporary files.

## Production

When Linkerd is needed, add these Kustomizations to
`clusters/prod-eu/platform.yaml`:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: mesh-crds
  namespace: flux-system
spec:
  interval: 10m
  path: ./k8s/platform/mesh/crds
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m

---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: mesh
  namespace: flux-system
spec:
  interval: 10m
  path: ./k8s/platform/mesh/overlays/prod-eu
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: mesh-crds
  decryption:
    provider: sops
    secretRef:
      name: sops-age
  wait: true
  timeout: 10m
```

Flux decrypts the four Secret manifests before applying them. It does not need
the local SOPS key or a Kustomize executable plugin.

Run `linkerd check` after reconciliation. Enable proxy injection only for the
workloads that need the mesh, in a later commit.

## Certificate rotation

`linkerd-identity-trust-roots.yaml` owns the public trust bundle. The root
private key is not stored in this repository.

To rotate the trust anchor without breaking mTLS:

1. add the new root beside the old root in the trust bundle, then rerender the
   control plane with that bundle;
2. restart the control plane and meshed workloads;
3. replace the encrypted issuer with one signed by the new root, then rerender
   the control plane with that issuer;
4. restart the control plane and meshed workloads again; and
5. remove the old root from the trust bundle and rerender the control plane one
   last time.

Issuer rotation under the same root skips the trust-bundle phases, but still
replaces the encrypted issuer and rerenders the control plane. Webhook rotation
must update the three encrypted webhook Secrets and rerender their CA bundles
in `linkerd-control-plane.yaml`.

Identity and webhook credentials rotate independently. The current webhook
certificates expire on 22 July 2028; rotate all three together before then.

## Upgrade

Use the new pinned Linkerd CLI to replace `crds/linkerd.yaml` and
`overlays/prod-eu/linkerd-control-plane.yaml`. Keep Gateway API separately
pinned and preserve the production identity and webhook credentials unless the
change is an intentional certificate rotation.

Validate before committing:

```bash
make check
```
