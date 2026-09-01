# Aperitif

A small Kubernetes foundation for independently developed product domains.

```text
domains/             business ownership, workload source, and Kubernetes configuration
platform/cluster/    cluster-wide capabilities
platform/runtime/    shared executable code
clusters/prod-eu/    production Flux inventory and reconciliation graph
docs/                implemented-boundary guide, proposed extensions, and examples
```

## Ownership

| Domain | Owns | Does not own |
| --- | --- | --- |
| Auth | Users, passkeys, sessions, operators, and JWKS | Accounts and product resources |
| Accounts | Individual and organization account boundaries and membership | Users, plans, and product data |
| Plans | Optional account plans and resolved feature snapshots | Accounts, payments, and product data |

Each domain owns its database. Domains exchange messages through NATS JetStream;
they never read another domain's database.

```text
domains/<domain>/
  contracts/                   # published event boundary, only when exported
  workloads/
    <workload>/                # source when owned, plus deployment configuration
      skaffold.yaml            # local workload configuration
      infra/base/              # reusable Kubernetes resources
      infra/overlays/<env>/    # environment-specific configuration
  Makefile                     # check, migrate, deploy, and dev interface
  skaffold.yaml                # local composition of that domain's workloads
```

`workloads/` contains operational units: APIs, UIs, databases, migration Jobs,
CronJobs, projectors, and domain-owned instances of shared runtimes. A workload's
`infra/` stays beside it because its image, network access, configuration, and
dependencies evolve together.

[`platform/runtime/outbox-relay`](platform/runtime/outbox-relay/README.md) owns
shared relay code only. An emitting domain owns its Relay Deployment, database
connection, NATS stream configuration, and NetworkPolicies.

## Event processing

The following is implemented policy for every producer and projector:

1. Commit the domain mutation and outbox row in one database transaction.
2. Publish a structured CloudEvent with `Content-Type: application/cloudevents`.
3. Use the CloudEvent ID as the JetStream message ID.
4. Delete the outbox row only after JetStream PubAck.
5. Validate before projecting; acknowledge only after the local projection
   transaction commits.
6. Treat published contract versions as immutable and snapshot-test them.

### Current-resource projection feeds

A resource feed lets another domain reconstruct current state without reading the
source database.

```text
subject: <domain>.<resource>.v<schema>.<resource-id>
message: complete current resource representation + data.revision
stream:  one latest message per subject
```

- `data.revision` is the source resource revision. It is unrelated to the
  subject schema version, CloudEvents `specversion`, and JetStream sequence.
- A state mutation replaces an unpublished older snapshot for the same subject
  in the same transaction. An older representation must never publish after a
  newer one.
- A singleton projector starts with `DeliverLastPerSubject`, persists the
  upstream revision with its local state, and ignores equal or older revisions.
  It converges to current state; it does not promise every intermediate change.
- A schema-shape change uses a complete new feed, for example `v2`. Publish V1
  and V2 together only while a real V1 consumer is migrating.
- A domain that promises recovery from state-stream loss must eventually provide
  a controlled reseed from its authoritative database. That Job is documented
  but not implemented yet; see [production recovery](clusters/prod-eu/README.md#future-state-feed-recovery).

Historical facts are different: they are append-only occurrences with their own
retention policy. Add them only when a concrete consumer needs history. Commands
are requests to one owner; they are not current-resource feeds.

## Work locally

Install the local tools:

```sh
brew bundle
```

Deploy only the shared capabilities a domain needs:

```sh
make -C platform/cluster/ingress deploy
make -C platform/cluster/event-bus deploy       # consumers or producers
make -C platform/cluster/observability deploy   # optional
```

Every domain has the same interface:

```sh
make -C domains/<domain> check
make -C domains/<domain> migrate
make -C domains/<domain> deploy
make -C domains/<domain> dev
```

There is deliberately no root Makefile or repository-wide development loop.

## Delivery

Domain and shared-runtime pull requests run the owning unit's `check`. A merge
to `master` builds, scans, and promotes changed first-party workload images.
Flux then writes the observed immutable digest into the production overlay and
reconciles it.

```text
merge
  -> publish changed domain image
  -> scan immutable digest
  -> promote :latest to that digest
  -> Flux records the digest in Git
  -> Flux applies the affected production overlay
```

Infrastructure-only changes reconcile directly from Git. Migration and
application changes use expand/contract because Flux does not make several
workloads atomic.

The shared Relay image has one Flux policy used by every domain Relay Deployment.
Its source follows the same pull-request and image-publication path as any other
buildable workload. See [Production EU](clusters/prod-eu/README.md).

## Documentation and operations

- [Documentation guide](docs/README.md) explains implemented boundaries,
  proposed extensions, examples, and the minimal new-domain path.
- [Production EU](clusters/prod-eu/README.md) covers Flux bootstrap, operation,
  dependencies, and the documented future recovery procedure.
- [TODO.md](TODO.md) contains only unresolved product-agnostic platform work.

Secrets remain SOPS-encrypted in environment overlays. Ephemeral and production
use separate Age keys; KSOPS decrypts locally and Flux decrypts production with
`Secret/flux-system/sops-age`. Applications and Traefik send telemetry to the
cluster OpenTelemetry Collector; the node agent collects container logs and
Kubernetes metrics. Current overlays use OpenObserve.
