# Mesh

Linkerd manifests exist, but mesh is not currently composed into local or
prod-eu.

Do not assume mTLS, service identity, or mesh policy exists unless this platform
unit is explicitly added to the environment.

## Checks

```sh
kubectl kustomize platform/mesh/overlays/ephemeral
kubectl kustomize platform/mesh/overlays/prod-eu
```
