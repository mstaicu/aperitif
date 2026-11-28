# Clusters

A cluster selects which workloads run there and supplies their installation-specific settings.

## Rules

- Put reusable manifests under `systems/<system>/<workload>/kustomize/`. List each installed system in `clusters/<cluster>/kustomization.yaml`.
- Name manifests for their kind (`deployment.yaml`). Where a directory has several workloads or objects of one kind, qualify the filename (`client-service.yaml`, `headless-service.yaml`). Give an overlay patch the same filename as its base resource.
- Name Secret files by purpose, such as `database-secret.yaml` locally and `database-secret.sops.yaml` in the cluster. Give the object a name that distinguishes it within its namespace, such as `api-db` or `cleanup-db`.
- Use the component name for related objects of different kinds (`Deployment/api`, `Service/api`). In the shared `flux-system` namespace, use names such as `nats` and `traefik` for platform components and `identity-api` for a domain's API.
- List each `<workload>/flux.yaml` in the system inventory. Keep its Flux `Kustomization` and image resources together. Declare each Namespace in `namespace.yaml` and list it in the owning Kustomize inventory.
- The Collector and OpenObserve each declare `otel` with Flux's `IfNotPresent` policy and pruning disabled. Remove either installation through Flux. Running `kubectl delete -k` on its cluster directory would delete the shared namespace.
- Deploy components through their production overlay. Point `spec.path` at that overlay directly, or at a cluster directory whose `kustomization.yaml` imports the overlay and supplies installation-specific settings.
- When copying a cluster, retarget every Flux `spec.path` under `clusters/<old-cluster>/` and the image automation's `spec.update.path`. These paths start at the repository root. Check that the recursive render contains a value unique to the new cluster and that image automation writes to its directory.
- Components reconcile independently. Database and contract changes must support the versions that can run together during rollout.

## Examples

| When | Expected result |
| --- | --- |
| A new API can use the reusable production overlay directly | Add `api/flux.yaml` to the system inventory. |
| The API needs this cluster's signing key | `api/kustomization.yaml` imports the production overlay and adds the encrypted Secret. `api/flux.yaml` selects this directory. |

## References

- [Cluster inventory](../prod-eu-do/kustomization.yaml) · [Identity inventory](../prod-eu-do/identity/kustomization.yaml) · [UI declaration with hostname](../prod-eu-do/identity/ui/flux.yaml) · [API installation overlay](../prod-eu-do/identity/api/kustomization.yaml)
- [Bootstrap prod-eu-do](../prod-eu-do/docs/README.md)
