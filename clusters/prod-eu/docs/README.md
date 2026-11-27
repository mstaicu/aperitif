# prod-eu

This inventory configures Flux to reconcile `clusters/prod-eu` on `master`.

## Rules

- Bootstrap against the intended Kubernetes context with the Age identity matching this cluster's encrypted Secrets. Keep the private key and GitHub credential outside the checkout.
- Store installation Secrets as `<secret-name>.sops.yaml`. When encrypting from the repository root, select the cluster policy with `sops --config clusters/prod-eu/.sops.yaml`.
- Image automation needs repository write access to commit selected image digests. Include the generated `flux-system/` in the cluster inventory after bootstrap so Flux manages its installation.
- Identity Postgres is intentionally ephemeral during testing. Replacing its pod discards its data.

## Examples

| When | Expected result |
| --- | --- |
| The API signing Secret changes | Flux can decrypt it with `sops-age`. The API needs a restart to read the new key. |
| Reviewing the installation before deployment | [Render the installation](bootstrap.md#render-the-installation) to check the cluster inventory and its workloads together. |

## References

- [Bootstrap procedure](bootstrap.md) · [SOPS policy](../.sops.yaml) · [Cluster inventory](../kustomization.yaml) · [Image automation](../image-update-automation.yaml)
