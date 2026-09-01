# Outbox Relay

Outbox Relay is the shared polling publisher from one domain's durable PostgreSQL
outbox to NATS JetStream. It transports the structured CloudEvent, subject, and
trace context the domain already committed; it does not define domain semantics.

```text
domain transaction -> outbox_events -> Outbox Relay -> JetStream
```

At startup Relay creates or updates the domain-owned stream configurations. It
then repeatedly locks one queued row with `FOR UPDATE SKIP LOCKED`, publishes it,
waits for PubAck, and deletes it in the same database transaction. A failed or
timed-out publication rolls back, leaving the row for retry. Delivery is at least
once, so consumers must be idempotent.

Relay transports current-resource feeds and, when a real requirement exists,
append-only CloudEvent facts. It does not create events, calculate revisions,
choose subjects or retention, serialize source mutations, run projectors, or
transport arbitrary command payloads.

## Database contract

Every emitting domain has an `outbox_events` table containing:

| Column | Meaning |
| --- | --- |
| `id` | Unique CloudEvent ID and JetStream message ID |
| `subject` | Exact NATS subject to publish |
| `event` | Structured CloudEvent JSON; its `id` equals `id` |
| `traceparent`, `tracestate` | Optional W3C trace context |
| `queued_at` | Stable relay order |

It also needs:

```sql
CREATE INDEX outbox_events_queued_at_id ON outbox_events (queued_at, id);
```

Write the business change and outbox row in one transaction. For a current-state
feed, the source also serializes revisions of one resource and replaces an
unpublished older snapshot for that resource subject in that transaction.

## Domain-owned deployment

Relay requires:

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | Emitting domain's PostgreSQL database |
| `NATS_URL` | NATS client endpoint |
| `NATS_STREAMS_PATH` | JSON array of native JetStream stream configurations |
| `OTEL_SERVICE_NAME` | Required when `OTEL_EXPORTER_OTLP_ENDPOINT` is set |

Each emitting domain owns `workloads/outbox-relay/infra/`: its Relay Deployment,
`streams.json` ConfigMap source, database/NATS NetworkPolicy access, and
environment overlays. Accounts and Plans are the working references.

For a current-resource feed, configure a stable resource-subject family and one
retained message per subject. Every stream declares its own `max_bytes`; the
platform intentionally has no universal value. Historical facts use a separate
append-only stream with a retention policy justified by their consumer.

## Add an emitting domain

1. Define the domain contract and producer under the [platform event contract](../../../README.md#event-processing).
2. Add `outbox_events` and the relay index in the domain migration.
3. Write the complete representation and outbox row in each exporting mutation.
4. Add `workloads/outbox-relay/skaffold.yaml` and its `infra/`, including
   `streams.json` and the domain-specific Relay deployment.
5. Prove producer transaction/outbox atomicity, PubAck-before-delete, duplicate
   delivery, and projector restart.

## Check

```sh
make -C platform/runtime/outbox-relay check
```

Pull requests that change Relay run this check. A merge to `master` builds,
scans, and promotes the Relay image through the same workflow as a domain-owned
buildable workload.
