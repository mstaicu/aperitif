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
3. installs the source and Kustomize controllers;
4. configures Flux to reconcile `k8s/clusters/prod-eu` on `master`.

The GitHub token must allow `flux bootstrap` to write its generated manifests
to the repository. After bootstrap, do not manually apply this directory; Flux
owns it.

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
```

The root owns each production domain Namespace once. Leaf Flux
`Kustomization`s own only resources inside those Namespaces, so pruning one
component cannot delete a shared Namespace.

The `platform` and `domains` assemblers place Flux objects in `flux-system`.
They are plain Kustomize directories, not extra Flux reconciliation layers.

Documents is local-only and is not part of this graph.

## Image releases

GitHub Actions pushes a changed component using its Git SHA and the mutable
`production` tag. Flux image automation is not installed. Publishing an image
therefore does not change the cluster. To select a release deterministically,
set the component production overlay's `newTag` to the published Git SHA and
commit it; ordinary Flux reconciliation then applies that Git change.

Flux ordering is not an atomic release transaction. Database and runtime
changes must remain expand/contract compatible while versions overlap.

## Check the cluster

```sh
flux get kustomizations --all-namespaces
```

Render the root without contacting the cluster:

```sh
kubectl kustomize clusters/prod-eu >/dev/null
```
