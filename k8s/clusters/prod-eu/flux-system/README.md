# Prod Flux Bootstrap

Run this with `kubectl` already pointing at the prod cluster:

```bash
export GITHUB_TOKEN=<your-github-pat>
export SOPS_AGE_KEY_FILE=/path/to/your/age.agekey

printenv GITHUB_TOKEN
printenv SOPS_AGE_KEY_FILE

make flux-bootstrap-prod-eu
```

`printenv` must print both values. That confirms they are exported and visible to
subprocesses started by `make`.

The target creates `Namespace/flux-system`, creates/updates `Secret/sops-age`,
then runs `flux bootstrap github` for `k8s/clusters/prod-eu`.

## What Bootstrap Does

Flux installs into `flux-system`, creates Git auth as `Secret/flux-system`, and
creates the root `GitRepository/flux-system` plus `Kustomization/flux-system`.

It also writes generated bootstrap files under:

```text
k8s/clusters/prod-eu/flux-system/
```

Do not manually apply `clusters/prod-eu/kustomization.yaml`; Flux owns that
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

## Manual Equivalent

The target wraps:

```bash
flux bootstrap github \
 --owner=mstaicu \
 --repository=aperitif \
 --branch=master \
 --path=k8s/clusters/prod-eu \
 --namespace=flux-system \
 --secret-name=flux-system \
 --personal \
 --token-auth \
 --components=source-controller,kustomize-controller
```

The `sops-age` Secret key must be named `identity.agekey`.

## Arguments

- `--owner`: GitHub owner.
- `--repository`: GitHub repository.
- `--branch`: branch Flux reconciles.
- `--path`: cluster root inside the Git repo.
- `--namespace`: namespace where Flux is installed.
- `--secret-name`: Git auth Secret used by `GitRepository/flux-system`.
- `--personal`: repo belongs to a personal GitHub account.
- `--token-auth`: use the GitHub token for HTTPS Git auth.
- `--components`: install only `source-controller` and `kustomize-controller`.

## Runtime Graph

The root path is:

```text
k8s/clusters/prod-eu
```

It reconciles:

```text
platform.yaml -> domains.yaml
```

Both use `GitRepository/flux-system` as their source.
