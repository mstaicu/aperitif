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
- Publish with the event ID as the JetStream message ID.
- Wait for PubAck before removing the outbox row.
- Validate events before projecting them.
- Acknowledge the message only after that transaction commits.

Resource projection feeds additionally:

- Include a monotonic resource version and carry the complete current resource
  state.
- Publish to `<domain>.<resource>.v<schema>.<resource-id>`; the CloudEvent
  `type` is not the NATS subject.
- Replace a still-pending snapshot for the same resource when writing a newer
  one, so an older state cannot publish after newer state.
- Retain one latest message per resource subject.
- A singleton projector creates an unnamed `DeliverLastPerSubject` consumer;
  each start reconciles the current baseline and then follows new messages.
- Apply its local writes idempotently in one database transaction.

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
