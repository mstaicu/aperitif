# Mesh

This directory contains inactive Linkerd manifests. No local or production
Kustomization imports them, so the platform currently provides no mesh mTLS,
service identity, or mesh policy.

Do not deploy these manifests as a supported platform unit. Before using a
mesh, either replace them with a current owned configuration or remove them.

## Before enabling with Flux

The production overlay currently uses KSOPS, which is only configured for
local Kustomize builds. Before adding the mesh to the production Flux graph:

1. list the encrypted Secret manifests under `resources` instead of the KSOPS
   generator;
2. remove `linkerd-ksops-generator.yaml` from the production overlay; and
3. configure the mesh Flux `Kustomization` with SOPS decryption using
   `Secret/flux-system/sops-age`.

Flux then decrypts the committed Secret manifests itself; it does not need the
local `ksops` executable.
