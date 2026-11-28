# prod-eu-do

This inventory configures Flux to reconcile `clusters/prod-eu-do` on `master`.

## Rules

- Bootstrap against the intended Kubernetes context with the Age identity matching this cluster's encrypted Secrets. Keep the private key and GitHub credential outside the checkout.
- Store installation Secrets as `<purpose>-secret.sops.yaml`. When encrypting from the repository root, select the cluster policy with `sops --config clusters/prod-eu-do/.sops.yaml`.
- Image automation needs repository write access to commit selected image digests. Include the generated `flux-system/` in the cluster inventory after bootstrap so Flux manages its installation.
- Identity Postgres is intentionally ephemeral during testing. Replacing its pod discards its data.

## Examples

| When | Expected result |
| --- | --- |
| The API signing Secret changes | Flux can decrypt it with `sops-age`. The API needs a restart to read the new key. |
| The [shared NATS config](../../../systems/platform/nats/kustomize/base/nats.conf) changes | Kustomize generates a new ConfigMap name. The StatefulSet picks it up and rolls the brokers one at a time. |
| The NATS system password changes | After Flux applies `nats-auth`, restart the StatefulSet so each broker reads the new password. |
| Enabling Cloudflare DNS-01 or rotating the token | Replace the encrypted placeholder with a valid DNS API token before requesting certificates. After Flux applies the Secret, restart Traefik so it reads the token. |
| Reviewing the installation before deployment | [Render the installation](bootstrap.md#render-the-installation) to check the cluster inventory and its workloads together. |

## References

- [Bootstrap procedure](bootstrap.md) · [SOPS policy](../.sops.yaml) · [Cluster inventory](../kustomization.yaml) · [Image automation](../image-update-automation.yaml)
