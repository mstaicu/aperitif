# Staging Flux Bootstrap

Staging does not currently have a full cluster graph like `prod-eu`. Add the
staging `kustomization.yaml`, platform graph, and domain graph before treating
this as a working environment.

Run this with `kubectl` already pointing at the staging cluster:

```bash
export GITHUB_TOKEN=<your-github-pat>
export SOPS_AGE_KEY_FILE=/path/to/your/age.agekey

printenv GITHUB_TOKEN
printenv SOPS_AGE_KEY_FILE

kubectl create namespace flux-system --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic sops-age \
 -n flux-system \
 --from-file=identity.agekey="$SOPS_AGE_KEY_FILE" \
 --dry-run=client -o yaml | kubectl apply -f -

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

`printenv` must print both values. That confirms they are exported and visible
to subprocesses.

## What Bootstrap Does

Flux installs into `flux-system`, creates Git auth as `Secret/flux-system`, and
creates the root `GitRepository/flux-system` plus `Kustomization/flux-system`.

It also writes generated bootstrap files under:

```text
k8s/clusters/staging-eu/flux-system/
```

## Controllers

Installed:

- `source-controller`
- `kustomize-controller`

Optional, intentionally not installed for now:

- `helm-controller`: only if the repo starts reconciling `HelmRelease`.
- `notification-controller`: only if Flux alerts or receivers are needed.
- `image-reflector-controller` and `image-automation-controller`: not used while
  GitHub Actions owns image builds and digest updates.

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
