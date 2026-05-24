# Staging Flux Bootstrap

Install only the controllers this repo uses:

```bash
export GITHUB_TOKEN=<your-github-pat>

flux bootstrap github \
 --owner=mstaicu \
 --repository=aperitif \
 --branch=master \
 --path=k8s/clusters/staging-eu \
 --namespace=flux-system \
 --secret-name=flux-system \
 --personal \
 --token-auth \
 --components=source-controller,kustomize-controller
```

Run this with `kubectl` already pointing at the staging cluster.

## What Bootstrap Does

Flux installs into `flux-system`, creates Git auth as `Secret/flux-system`, and
creates the root `GitRepository/flux-system` plus `Kustomization/flux-system`.

It also writes generated bootstrap files under:

```text
k8s/clusters/staging-eu/flux-system/
```

Do not manually apply `clusters/staging-eu/kustomization.yaml`; Flux owns that
after bootstrap.

## Controllers

Installed:

- `source-controller`
- `kustomize-controller`

Optional, intentionally not installed for now:

- `helm-controller`: only if the repo starts reconciling `HelmRelease`.
- `notification-controller`: only if Flux alerts or receivers are needed.
- `image-reflector-controller` and `image-automation-controller`: not used while
  GitHub Actions owns image builds and digest updates.

## After Bootstrap

Bootstrap does not create `sops-age`. Create it in `flux-system` from the age
private key matching `.sops.yaml`:

```bash
age-keygen -y /path/to/your/age.agekey

kubectl create secret generic sops-age \
 -n flux-system \
 --from-file=identity.agekey=/path/to/your/age.agekey
```

The file key inside the Secret must end with `.agekey`.
