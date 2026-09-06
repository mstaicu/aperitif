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

For the currently implemented snapshot feeds, every producer and projector
follows these rules:

1. Commit the source mutation and outbox row in one database transaction.
2. Publish a structured CloudEvent with `Content-Type: application/cloudevents+json`.
3. Use the CloudEvent ID as the JetStream message ID.
4. Condition publication on the subject's last JetStream sequence. After a
   failed attempt, retry from a fresh outbox transaction.
5. Delete an outbox row only after JetStream PubAck.
6. Validate before projecting and acknowledge only after the local transaction
   commits.
7. Never change a published contract version; snapshot-test it.

Relay transports JSON messages using the domain-owned `outbox_messages` table:
`id`, NATS `subject`, `payload`, `headers`, and `queued_at`. It does not interpret
the payload; producers own validation and consumers own processing. See the
[Relay contract](docs/operations.md#relay) for header rules and delivery limits.

Current-resource feeds implement
[Event-Carried State Transfer](https://martinfowler.com/articles/201701-event-driven.html#Event-carriedStateTransfer):
consumers maintain local data without fetching it from the source domain.
Each snapshot is a complete resource representation, not a history:

```text
subject: <domain>.<resource>.v<schema>.<resource-id>
message: complete representation + data.version
stream:  one latest message per subject
```

`data.version` is a positive safe integer owned by the source resource. It is
unrelated to the subject schema version, CloudEvents `specversion`, or JetStream
sequence. A mutation replaces an unpublished older representation for the same
subject in its source transaction. A current-state projector starts with `DeliverLastPerSubject`,
stores the upstream version, and ignores equal or older messages. A consumer
that uses a feed only to initialize a local resource remains idempotent but
need not retain the source representation or version.

A shape change creates a complete new feed such as `v2`. Publish both versions
only while a real V1 consumer migrates. Historical facts are separate
append-only streams. Commands are owner-directed requests, not resource feeds.
See [Message contracts](docs/domains.md#message-contracts) for intent, payload
shapes, and the filename convention.

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
