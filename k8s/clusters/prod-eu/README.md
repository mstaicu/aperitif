# Prod EU Cluster

Flux root for prod-eu.

## Bootstrap

Run with `kubectl` pointing at the prod cluster:

```sh
export GITHUB_TOKEN=<your-github-pat>
export SOPS_AGE_KEY_FILE=/path/to/your/age.agekey

printenv GITHUB_TOKEN
printenv SOPS_AGE_KEY_FILE

make -C clusters/prod-eu bootstrap
```

The target creates `Namespace/flux-system`, creates/updates `Secret/sops-age`,
then runs `flux bootstrap github` for `k8s/clusters/prod-eu`. The GitHub token
must be able to write repository contents so image automation can later commit
selected image updates.

Do not manually apply `clusters/prod-eu/kustomization.yaml` after bootstrap.
Flux owns reconciliation from this path.

## Graph

```text
kustomization.yaml
  platform/
    event-bus.yaml
    ingress.yaml
    observability.yaml
  domains/
    identity-*.yaml
    accounts-*.yaml
    entitlements-*.yaml
```

Documents is a local-only proof domain and is not composed into prod-eu.

The root owns the three cluster-scoped domain `Namespace` resources directly.
The `platform/` and `domains/` Kustomizations contain only namespaced Flux
control resources and set `namespace: flux-system`. Do not add intermediate
Flux objects for these directories; leaf `dependsOn` relationships own the
deployment ordering.

## Controllers

Installed:

- `source-controller`
- `kustomize-controller`
- `image-reflector-controller`
- `image-automation-controller`

Not installed for now:

- `helm-controller`
- `notification-controller`

Nine `ImageRepository` and `ImagePolicy` pairs track the production domain
images. `ImageUpdateAutomation/domains` writes selected digests into the marked
component overlays under `k8s/domains`.

The overlays retain their current `latest` tag and start with an empty digest,
so this transition does not require `production` tags to exist immediately.
Both fields are marked. After a component is next built, image automation
changes that overlay to `production` and fills its observed digest together.

The automation path is `./k8s/domains` while this directory is nested in the
containing repository. Change it to `./domains` when `k8s/` becomes the Git
repository root.

## Release Handoff

GitHub Actions builds changed components and publishes both the triggering SHA
and the `production` tag. It does not update manifests or invoke Flux against
the cluster.

The image reflector resolves the digest behind each `production` tag. Image
automation commits changed digests, then the existing leaf `Kustomization`
objects reconcile them. Independent manifest commits and mixed-version rollouts
are intentional: domain changes must follow expand/contract compatibility. For
a schema expansion required by new code, allow the migration Kustomization to
finish before releasing that code; contraction belongs in a later release.

`dependsOn` and `wait` provide reconciliation ordering and health checks. They
do not turn separate application deployments into an atomic runtime cutover.
The Git history is desired state, while Flux status is deployment status.

Check image automation with:

```sh
flux get images all --all-namespaces
flux reconcile image update domains --namespace=flux-system
```

## Manual Equivalent

```sh
flux bootstrap github \
 --owner=mstaicu \
 --repository=aperitif \
 --branch=master \
 --path=k8s/clusters/prod-eu \
 --namespace=flux-system \
 --secret-name=flux-system \
 --personal \
 --token-auth \
 --components=source-controller,kustomize-controller \
 --components-extra=image-reflector-controller,image-automation-controller
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
- `--components`: install only the listed Flux controllers.
- `--components-extra`: additionally install the two controllers required for
  registry scanning and Git image updates.
