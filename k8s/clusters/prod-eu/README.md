# Production EU

This directory is the Flux entry point for the production cluster. Flux reads
it from Git and reconciles the platform and production domains.

## Bootstrap

Point `kubectl` at the intended production cluster, then provide GitHub and
SOPS credentials:

```sh
export GITHUB_TOKEN=<github-token>
export SOPS_AGE_KEY_FILE=/path/to/production-age-key
make -C clusters/prod-eu bootstrap
```

The target:

1. creates `flux-system`;
2. creates `Secret/flux-system/sops-age` from the local age key;
3. installs the source, Kustomize, image reflector, and image automation
   controllers;
4. configures Flux to reconcile `k8s/clusters/prod-eu` on `master`.

The GitHub token needs repository write access because image automation commits
selected image digests. After bootstrap, do not manually apply this directory;
Flux owns it.

## Reconciliation graph

```text
clusters/prod-eu
  platform
    ingress CRDs -> ingress
    event bus
    observability
  domain namespaces
  domains
    postgres -> migrations -> api/publisher/projector/ui
  image automation
```

The root owns each production domain Namespace once. Leaf Flux
`Kustomization`s own only resources inside those Namespaces, so pruning one
component cannot delete a shared Namespace.

The `platform` and `domains` assemblers place Flux objects in `flux-system`.
They are plain Kustomize directories, not extra Flux reconciliation layers.

Documents is local-only and is not part of this graph.

## Image releases

GitHub Actions pushes a changed component's `production` tag. An
`ImageRepository` and `ImagePolicy` resolve its digest. The `domains`
`ImageUpdateAutomation` then commits that digest into the marked production
overlay, after which the component's Flux `Kustomization` applies it.

The automation path is currently `./k8s/domains` because this project is nested
inside its containing repository. Change it to `./domains` when this directory
becomes the Git repository root.

Flux ordering is not an atomic release transaction. Database and runtime
changes must remain expand/contract compatible while versions overlap.

## Check the cluster

```sh
flux get kustomizations --all-namespaces
flux get images all --all-namespaces
flux reconcile image update domains --namespace=flux-system
```

Render the root without contacting the cluster:

```sh
kubectl kustomize clusters/prod-eu >/dev/null
```
