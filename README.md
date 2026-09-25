# Aperitif

A Kubernetes foundation for independently developed B2B and B2C SaaS domains.
It supplies small deployment and integration boundaries without prescribing a
product model.

```text
domains/             business capabilities and their deployable workloads
platform/cluster/    optional cluster-wide capabilities
platform/runtime/    shared executable infrastructure code
clusters/prod-eu/    Flux production inventory and release state
docs/                domain rules, operations, and outstanding work
```

## Boundaries

| Domain | Owns | Does not own |
| --- | --- | --- |
| Auth | Users, credentials, sessions, operators, JWTs and JWKS | Accounts and product authority |
| Accounts | Individual and organization boundaries; generic membership | Identities, plans and product roles |
| Plans | Account plan selection and resolved feature values | Accounts, billing and product data |

Each domain owns its data and schema. No domain reads another domain's database.
Cross-domain identifiers are opaque. A domain decides authorization from its own
state and local projections. Shared runtime code transports data but contains no
business rules.

Capabilities are optional. A product adds NATS, contracts, an outbox or a
projection only when it has a concrete asynchronous integration.

## Event contract

Current-resource feeds use complete snapshots so a consumer can rebuild local
state without calling the producer:

```text
subject: <domain>.<resource>.v<schema>.<resource-id>
message: complete representation + data.version
stream:  one latest message per subject
```

Every current snapshot producer and consumer follows these rules:

1. Commit the business mutation and outbox row in one database transaction.
2. Replace any unpublished older snapshot for the same subject in that transaction.
3. Publish a structured CloudEvent as `application/cloudevents+json`.
4. Reuse the CloudEvent ID as the JetStream message ID across retries.
5. Condition publication on the subject's previous JetStream sequence.
6. Retry a failed publication from a fresh outbox transaction.
7. Delete an outbox row only after JetStream acknowledges publication.
8. Validate a message before projecting it.
9. Commit projected state before acknowledging the message.
10. Store and compare the producer's positive, monotonic `data.version`.
11. Ignore an equal or older snapshot while the projection schema is unchanged.
12. Never change a published wire schema; introduce a new feed version.

`data.version` belongs to the business resource. It is independent of the feed
schema version, CloudEvents version and JetStream sequence. Relay transports JSON
and headers without interpreting domain payloads.

Historical facts, deltas and commands need their own retention and ordering
rules. They must not inherit snapshot coalescing merely because they use the
same transport.

## Local workflow

Install tools with `brew bundle`, deploy only the platform capabilities the
domain needs, and use the domain's stable interface:

```sh
kubectl apply -k platform/cluster/ingress/overlays/local
kubectl apply -k platform/cluster/event-bus/overlays/local
kubectl apply -k platform/cluster/observability/overlays/local

make -C domains/<domain> check
make -C domains/<domain> up
make -C domains/<domain> dev
make -C domains/<domain> down
```

There is deliberately no root Makefile or repository-wide development loop.
Local and disposable environments use public development credentials. Non-local
secrets remain SOPS-encrypted.

## Documentation

- [Guide, extension recipes and examples](docs/README.md)
- [Domain model and extension rules](docs/domains.md)
- [Local, E2E and production operations](docs/operations.md)
- [Outstanding foundation work](docs/roadmap.md)
