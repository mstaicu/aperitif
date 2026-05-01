# Mesh Platform

Mesh contains Linkerd manifests, but it is not currently part of the active local or prod-eu composition.

Do not assume mTLS, service identity, or mesh policy exists unless this platform unit is explicitly composed into the environment.

## Intended Boundary

Mesh should own only cross-cutting service-to-service transport concerns:

- mTLS between workloads,
- service identity,
- mesh policy,
- proxy injection,
- Linkerd control plane resources.

It should not own domain authentication, domain authorization, or business-level actor semantics.

## Current State

```text
platform/mesh/base
platform/mesh/overlays/dev
platform/mesh/overlays/live
```

The overlays contain certificate material and webhook trust configuration for Linkerd. Treat this folder as inactive until it is deliberately added to the platform spine.

## Enabling Later

Before enabling mesh:

- decide whether every domain namespace should be injected or only selected workloads,
- verify local and live certificate management,
- verify Gateway API CRD ownership does not conflict with ingress,
- add explicit Flux Kustomizations under `clusters/<env>/platform`,
- add Make/Skaffold targets only if local development needs it,
- update network policies after observing actual traffic under the mesh.

## Checks

```sh
kubectl kustomize platform/mesh/overlays/dev
kubectl kustomize platform/mesh/overlays/live
```
