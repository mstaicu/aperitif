# https://github.com/fluxcd/flux2/releases

brew install fluxcd/tap/flux
flux check --pre
flux --version

# Bootstrap model

For this repo, bootstrap is the source-of-truth for Git access.

That means:

- `flux bootstrap github --token-auth ...` creates `GitRepository/flux-system`
  and `Secret/flux-system`
- the `flux-system` repo source and secret referenced by the manifests are
  created by bootstrap
- by default this comes from `--namespace=flux-system` and
  `--secret-name=flux-system`, and the generated `gotk-sync.yaml` uses those
  names
- cluster manifests should reference `sourceRef.name: flux-system`
- you do not need a second `GitRepository` or a separate `github-ssh` secret
  for this same repo

So the intended model is:

- bootstrap owns `clusters/staging-eu/flux-system`
- cluster reconciliations point at `flux-system`
- `sops-age` remains a separate secret you create yourself

If you run the bootstrap command from the root of the repo, Flux writes the
standard bootstrap files in `k8s/clusters/staging-eu/flux-system` next to this
README:

- `gotk-components.yaml`
- `gotk-sync.yaml`
- `kustomization.yaml`

The `--path=k8s/clusters/staging-eu` flag is relative to the repository root.

## Bootstrap command

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

## Parameter explanation

- `--owner=mstaicu`
  - GitHub owner of the repo
- `--repository=aperitif`
  - GitHub repo name
- `--branch=master`
  - branch Flux will reconcile from
- `--path=k8s/clusters/staging-eu`
  - cluster root inside the Git repo for this specific cluster
- `--namespace=flux-system`
  - install Flux into the `flux-system` namespace and generate bootstrap sync objects there
- `--secret-name=flux-system`
  - store the Git auth secret as `Secret/flux-system`, which the generated `GitRepository/flux-system` uses
- `--personal`
  - repo belongs to a personal GitHub account, not an organization
- `--token-auth`
  - use the GitHub PAT for Git auth over HTTPS and store that auth in `Secret/flux-system`
- `--components=source-controller,kustomize-controller`
  - install the minimum controllers needed to fetch Git sources and reconcile manifests

## Components

Default bootstrap includes:

source
kustomize
helm
notification

For this repo, install:

```bash
flux bootstrap github \
 --components=source-controller,kustomize-controller
```

Image builds and manifest digest updates are owned by GitHub Actions. Flux only
reconciles Git manifests.

## Install export

```bash
flux install \
 --version=v2.8.1 \
 --export > flux-install.yaml
```

```bash
flux install \
 --version=v2.8.1 \
 --components=source-controller,kustomize-controller \
 --export > flux-install.yaml
```

## Secrets

| Secret         | Used By                                   | Required For                           |
| -------------- | ----------------------------------------- | -------------------------------------- |
| `flux-system`  | Flux bootstrap Git auth                   | Bootstrapping and syncing Flux state   |
| `sops-age`     | kustomize-controller                      | Decrypting secrets                     |

source-controller → uses flux-system
kustomize-controller → uses sops-age
