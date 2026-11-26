# Clusters

A cluster selects which workloads run there and supplies their installation-specific settings.

## Rules

- Put reusable manifests under `systems/<system>/infra/<workload>/`. Put a cluster's namespace and Flux declarations under `clusters/<cluster>/systems/<system>/`.
- Use `<workload>.yaml` for the Flux declaration. Add a sibling `<workload>/` only for installation inputs such as a hostname or an encrypted Secret.
- The system inventory lists the namespace and Flux declarations. Each declaration selects one workload path. This gives its rendered resources one owner.
- Components reconcile independently. Database and contract changes must support the versions that can run together during rollout.

## Examples

| When | Expected result |
| --- | --- |
| A new API can use the reusable production overlay directly | Its Flux declaration points there. The system and cluster inventories explicitly include it. |
| The API needs this cluster's signing key | Its declaration points to a sibling overlay that imports the production profile and adds the encrypted Secret. |

## References

- [Cluster system inventory](../prod-eu/systems/kustomization.yaml) · [Identity inventory](../prod-eu/systems/identity/kustomization.yaml) · [API declaration](../prod-eu/systems/identity/api.yaml) · [API installation overlay](../prod-eu/systems/identity/api/kustomization.yaml)
- [Bootstrap prod-eu](../prod-eu/documents/README.md)
