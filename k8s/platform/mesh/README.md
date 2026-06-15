# Mesh Platform

Mesh contains Linkerd manifests, but it is not currently composed into local or
prod-eu.

Do not assume mTLS, service identity, or mesh policy exists unless this platform
unit is explicitly added to the environment.

## Owns When Enabled

- Linkerd control plane resources
- proxy injection
- service identity and mTLS
- mesh policy

It does not own domain authentication, authorization, or actor semantics.

## Checks

```sh
kubectl kustomize platform/mesh/overlays/ephemeral
kubectl kustomize platform/mesh/overlays/prod-eu
```
