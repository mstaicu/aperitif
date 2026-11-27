# Clusters

A cluster selects which workloads run there and supplies their installation-specific settings.

## Rules

- Put reusable manifests under `systems/<system>/<workload>/kustomize/`. List each installed system in `clusters/<cluster>/kustomization.yaml`.
- List the shared namespace, if any, and each `<workload>/flux.yaml` in the system inventory. Put the Flux `Kustomization` first in that file, followed by any image resources or workload namespace.
- Point `spec.path` at the reusable production overlay. When the installation needs extra files, put a `kustomization.yaml` and those files beside `flux.yaml`, and point `spec.path` at that directory.
- Components reconcile independently. Database and contract changes must support the versions that can run together during rollout.

## Examples

| When | Expected result |
| --- | --- |
| A new API can use the reusable production overlay directly | Add `api/flux.yaml` to the system inventory. |
| The API needs this cluster's signing key | `api/kustomization.yaml` imports the production overlay and adds the encrypted Secret. `api/flux.yaml` selects this directory. |

## References

- [Cluster inventory](../prod-eu/kustomization.yaml) · [Identity inventory](../prod-eu/identity/kustomization.yaml) · [UI declaration with hostname](../prod-eu/identity/ui/flux.yaml) · [API installation overlay](../prod-eu/identity/api/kustomization.yaml)
- [Bootstrap prod-eu](../prod-eu/docs/README.md)
