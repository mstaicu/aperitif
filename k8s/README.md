# Aperitif

A small Kubernetes platform for independently developed domains.

```text
domains/             business domains and their deployable components
platform/            ingress, event bus, and observability
clusters/prod-eu/    production Flux inventory
docs/                platform capabilities and business recipes
.github/workflows/   checks and image publication
```

## Domains

| Domain     | Owns                                                 |
| ---------- | ---------------------------------------------------- |
| `auth`     | Users, passkeys, sessions, operator status, and JWKS |
| `accounts` | Accounts and membership                              |
| `plans`    | Plans and resolved account features                  |

See [docs/README.md](docs/README.md) for the platform model, proposed
capabilities, and business recipes.

Each domain owns its database. Domains exchange versioned events through an
outbox and NATS JetStream; they never read each other's databases.

Each deployable component keeps its implementation, Dockerfile, and Kubernetes
manifests under `domains/<domain>/components/<component>`.

### Event processing

Every event-driven component follows the same reliability contract:

- Commit the business mutation and outbox event in one database transaction.
- Treat every published contract version as immutable and snapshot-test its
  contract.
- Include a unique event ID, source, and timestamp.
- Publish the structured CloudEvent body with NATS `Content-Type: application/cloudevents`.
- Publish with the event ID as the JetStream message ID.
- Wait for PubAck before removing the outbox row.
- Validate events before projecting them.
- Acknowledge the message only after that transaction commits.

Resource projection feeds additionally:

- Carry the complete current resource state and a monotonic `data.revision`.
  It is unrelated to the schema version in `v<schema>`, the
  CloudEvents `specversion`, and the JetStream sequence.
- Publish to `<domain>.<resource>.v<schema>.<resource-id>`; the CloudEvent
  `type` is not the NATS subject.
- Configure a state stream for the resource family as
  `<domain>.<resource>.*.*`; a projector filters the one schema version it
  understands. A new schema version therefore does not require changing the
  stream's subject family.
- Serialize mutations of one resource through its source revision. In the same
  transaction, replace a still-pending snapshot for that resource subject when
  writing a newer one, so an older state cannot publish after newer state.
- Retain one latest message per resource subject.
- Converge to current state, rather than promise every intermediate revision.
  A resource can change from revision 1 to 3 before a projector observes
  revision 2; a consumer that must observe every occurrence needs a separate
  append-only fact stream.
- A singleton projector creates an unnamed `DeliverLastPerSubject` consumer;
  each start reconciles the current baseline and then follows new messages.
  Replicas would create independent reconcilers, not a shared worker pool.
- Apply local writes idempotently in one database transaction. A projection
  that persists upstream state also persists its upstream resource revision and
  ignores an equal or older revision.
- Treat stream byte capacity and pending-outbox age as monitored operational
  limits. Before relying on recovery from state-stream loss, the owning domain
  must provide a controlled reseed from its authoritative database that
  republishes current representations with new event IDs and their existing
  resource revisions.

A published resource representation is immutable. When its data schema rejects
unknown properties, as current V1 feeds do, any data-shape change starts a new
complete V2 feed on its own `v2` subjects and CloudEvent type. Dual-publish only
while a real V1 consumer still needs migration.

Each domain owns its contract package. For each exported resource feed, it
contains only the resource data schema, its CloudEvent schema and validator,
the NATS subject builder, an event builder, one example, and a schema snapshot
test. The resource representation is `data`; `data.revision` is its source
revision. Do not export database records, a shared event framework, generic
metadata, or unused fact and command contracts.

Historical facts are append-only occurrences. They may use bounded retention;
they are not resource projection feeds and do not require a complete resource
representation.

## Work locally

Install tools:

```sh
brew bundle
```

Deploy the shared units you need:

```sh
make -C platform/ingress deploy
make -C platform/event-bus deploy
make -C platform/observability deploy  # optional
```

Every domain exposes the same commands:

```sh
make -C domains/<domain> help
make -C domains/<domain> check
make -C domains/<domain> migrate
make -C domains/<domain> deploy
make -C domains/<domain> dev
```

There is no root Makefile or repository-wide development loop.

## Deliver changes

When this directory becomes the repository root:

```text
pull request
  -> check changed domains and platform units

merge to master
  -> build changed component images
  -> scan the immutable image digest
  -> move :latest to that digest
  -> Flux commits the digest into the production overlay
  -> Flux reconciles the cluster
```

Infrastructure changes are reconciled directly from Git. Database changes use
expand/contract, and migration Jobs complete before dependent workloads.

See [clusters/prod-eu/README.md](clusters/prod-eu/README.md) for production
bootstrap and operation.

## Secrets and telemetry

Secrets remain SOPS-encrypted in their environment overlays. Ephemeral and
production use different Age keys. KSOPS decrypts locally; Flux decrypts
production with `Secret/flux-system/sops-age`.

Applications and Traefik send OpenTelemetry to the cluster Collector. The node
agent collects container logs and Kubernetes metrics. Environment overlays
choose the backend; both currently use OpenObserve.

See [TODO.md](TODO.md) for unfinished production work.
