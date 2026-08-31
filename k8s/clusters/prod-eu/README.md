# Production EU

Flux reconciles `master` from `k8s/clusters/prod-eu`. After bootstrap, Git is
the only normal path for changing this cluster.

## Bootstrap

Before bootstrap:

- select the intended production Kubernetes context;
- provide a GitHub token that can administer `mstaicu/aperitif`;
- provide the production Age private key;
- publish every image referenced by the inventory, or configure registry pulls;
- ensure each production image overlay has a real digest behind `:latest`.

```sh
export GITHUB_TOKEN=<github-token>
export SOPS_AGE_KEY_FILE=/path/to/production-age-key
make -C clusters/prod-eu bootstrap
```

Bootstrap creates `flux-system`, its SOPS Age Secret, the Flux source,
Kustomize, image reflector, and image automation controllers, a write-capable
Git deploy key, and the root reconciliation. It also commits the generated
`flux-system/` files; pull that commit, add the directory to this
Kustomization, then commit and push it.

## Inventory

```text
clusters/prod-eu/
  flux-system/        Flux bootstrap output
  platform.yaml       shared cluster capability graph
  domains/*.yaml      one reconciliation graph per domain
  images/*.yaml       image repositories, policies, and one digest writer
  kustomization.yaml  complete inventory
```

The root inventory owns Namespaces, Flux resources, and graph entrypoints. A
child Flux `Kustomization` owns only the resources rendered from its `spec.path`.
Production overlays select a Namespace; ephemeral overlays create disposable
Namespaces. Namespaces deliberately disable Flux pruning. Every namespaced Flux
Toolkit resource explicitly uses `flux-system`.

## Delivery

```text
merge to master
  -> publish changed domain workload image
  -> scan immutable digest
  -> promote :latest
  -> ImagePolicy observes its digest
  -> ImageUpdateAutomation commits matching overlay digests
  -> Flux reconciles each affected leaf
```

- Domain code is built by the current domain-workload workflow.
- Infrastructure-only changes reconcile directly from Git.
- Image publishing is serialized.
- Flux digest commits do not cause another domain image build.
- Releases use expand/contract; Flux does not make several workloads atomic.
- The Outbox Relay image policy is already shared by every domain Relay
  Deployment. Relay source is not yet routed through the domain-only workflow,
  so publish it deliberately until that delivery path is added.

## Reconciliation order

```text
ingress-crds ──┬──> ingress
               ├──> auth-api and auth-ui
               ├──> accounts-api
               └──> plans-api

auth-postgres ──> auth-migrations ──> auth-api and auth-cleanup

accounts-postgres ──> accounts-migrations ──> accounts-api and accounts-outbox-relay
event-bus ─────────────────────────────────────────────────────> accounts-outbox-relay

plans-postgres ──> plans-migrations ──> plans-api and plans-outbox-relay
event-bus ───────────────────────────────────────────────────> plans-outbox-relay
accounts-outbox-relay ───────────────────────────────────────> plans-accounts-projection
```

`dependsOn` controls Flux reconciliation order, not application-level runtime
availability. NATS has a `20m` reconciliation timeout; other leaves use `5m`.
Observability reconciles independently because telemetry must not block domains.
Migration Jobs use `force: true`; regular workload leaves use `prune: true`.

## Operate

```sh
flux get kustomizations --all-namespaces
flux get images repository --all-namespaces
flux get images policy --all-namespaces
flux get images update --all-namespaces

flux reconcile source git flux-system
flux reconcile kustomization <name> --with-source
flux logs --kind=Kustomization --name=<name>
```

To intentionally delete a domain Namespace: remove its workloads, reconcile,
remove the Namespace prune annotation and reconcile, then remove the Namespace
manifest and reconcile again.

## Future state-feed recovery

This procedure is a required recovery promise for every state-producing domain,
but no reseed Job is implemented yet.

After loss or a deliberate reset of a current-resource stream, the source domain
will run a manually invoked one-shot Job using its deployed API image. The Job
will read only that domain's authoritative database and write one current
representation per resource to the normal outbox. It preserves `data.revision`
but creates a fresh CloudEvent ID and timestamp. Outbox Relay then publishes the
entries normally; the Job does not connect to NATS.

The eventual recovery procedure is:

1. Recreate the stream from the domain-owned `streams.json`.
2. Run that domain's reseed Job once.
3. Wait for Relay to drain the outbox and verify one current subject per
   authoritative resource.
4. Restart or reset dependent projectors so they bootstrap from the restored
   baseline and then follow new messages.

Its recovery test must prove stream deletion, reseed, a fresh projection
bootstrap, a later mutation, and a concurrent source mutation of the same
resource.

## Validate

```sh
kubectl kustomize clusters/prod-eu >/dev/null
```

The root inventory and every `spec.path` it references must render independently.
