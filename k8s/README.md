# Aperitif

A small Kubernetes foundation for independently developed product domains.

```text
domains/             business ownership and deployable workloads
platform/cluster/    cluster-wide capabilities
platform/runtime/    shared executable source
clusters/prod-eu/    Flux production inventory
docs/                platform documentation, extensions, and examples
```

## Implemented boundaries

| Domain | Owns | Does not own |
| --- | --- | --- |
| Auth | Users, passkeys, sessions, operators, JWKS | Accounts and product resources |
| Accounts | Individual and organization ownership boundaries; generic membership | Users, plans, and product data |
| Plans | Optional account plans and resolved feature maps | Accounts, payments, and product data |

Domains own their databases. They exchange NATS messages; no domain reads another
domain's database.

## Event processing

Every producer and projector follows these rules:

1. Commit the source mutation and outbox row in one database transaction.
2. Publish a structured CloudEvent with `Content-Type: application/cloudevents`.
3. Use the CloudEvent ID as the JetStream message ID.
4. Delete an outbox row only after JetStream PubAck.
5. Validate before projecting and acknowledge only after the local transaction
   commits.
6. Never change a published contract version; snapshot-test it.

A current-resource feed is a complete representation, not a history:

```text
subject: <domain>.<resource>.v<schema>.<resource-id>
message: complete representation + data.revision
stream:  one latest message per subject
```

`data.revision` belongs to the source resource. It is unrelated to the subject
schema version, CloudEvents `specversion`, or JetStream sequence. A mutation
replaces an unpublished older representation for the same subject in its source
transaction. A current-state projector starts with `DeliverLastPerSubject`,
stores the upstream revision, and ignores equal or older messages. A consumer
that uses a feed only to initialize a local resource remains idempotent but
need not retain the source representation or revision.

A shape change creates a complete new feed such as `v2`. Publish both versions
only while a real V1 consumer migrates. Historical facts are separate
append-only streams. Commands are owner-directed requests, not resource feeds.

## Local work

```sh
brew bundle

make -C platform/cluster/ingress deploy
make -C platform/cluster/event-bus deploy
make -C platform/cluster/observability deploy

make -C domains/<domain> check
make -C domains/<domain> migrate
make -C domains/<domain> deploy
make -C domains/<domain> dev
```

There is deliberately no root Makefile or repository-wide development loop.

## Read next

- [Platform guide](docs/README.md)
- [Domains](docs/domains.md)
- [Operations and production](docs/operations.md)
- [Roadmap](docs/roadmap.md)

Secrets remain SOPS-encrypted in overlays. Local and production use separate
Age keys. Applications emit OTLP to the cluster Collector; the node agent
collects container logs and Kubernetes metrics.
