# Outbox Relay

Outbox Relay is the shared runtime that publishes a domain's durable PostgreSQL
outbox to NATS JetStream. It is domain-agnostic: it transports the structured
CloudEvent, subject, and tracing context already committed by the source domain.
It is not a generic transport for arbitrary command payloads.

It is the polling-publisher implementation of the transactional-outbox
pattern. `main.mjs` owns process composition; `outbox.mjs` owns the one-entry
lock, publish, PubAck, and delete procedure.

It does four things:

1. Reconciles the domain-owned JetStream stream configurations at startup.
2. Locks one queued outbox entry with `FOR UPDATE SKIP LOCKED`.
3. Publishes its structured CloudEvent to the stored subject, using the event
   ID as the NATS message ID.
4. Deletes the entry only after JetStream acknowledges the publication.

On a failed or timed-out publication, the transaction rolls back and the entry
remains for retry. Delivery is therefore at least once; consumers must follow
the idempotent projection rule in the [platform event contract](../../../README.md#event-processing).

Outbox Relay does not create events, calculate a resource revision, serialize
source mutations, choose retention, or run projections. Those are domain
decisions.

## Domain contract

The domain database must have an `outbox_events` table with these columns:

| Column                      | Purpose                                                       |
| --------------------------- | ------------------------------------------------------------- |
| `id`                        | Unique event ID; Outbox Relay uses it as the NATS message ID. |
| `subject`                   | Exact NATS subject to publish.                                |
| `event`                     | Structured CloudEvent JSON object. Its `id` must equal `id`.  |
| `traceparent`, `tracestate` | Optional W3C tracing context.                                 |
| `queued_at`                 | Queue order.                                                  |

It also needs this index:

```sql
CREATE INDEX outbox_events_queued_at_id ON outbox_events (queued_at, id);
```

Commit the business change and its outbox entry in the same transaction. For a
current-resource state feed, the source also follows the root contract: it
serializes revisions for that resource and replaces an unpublished older
snapshot for the same subject in that transaction.

## Deployment contract

Outbox Relay requires:

| Variable            | Meaning                                                         |
| ------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`      | The emitting domain's PostgreSQL database.                      |
| `NATS_URL`          | The NATS client endpoint.                                       |
| `NATS_STREAMS_PATH` | Path to a JSON array of native JetStream stream configurations. |

If `OTEL_EXPORTER_OTLP_ENDPOINT` is set, `OTEL_SERVICE_NAME` is also required.

Each emitting domain owns `domains/<domain>/workloads/outbox-relay/infra/`:

- a `streams.json` ConfigMap source mounted at `NATS_STREAMS_PATH`;
- an Outbox Relay Deployment with its domain database and NATS configuration;
- network access to that database and NATS; and
- its environment overlays.

The stream configuration expresses the domain's retention promise. For a
current-resource projection feed, configure a stable resource-subject family
and retain one message per subject. Every stream declares `max_bytes`; the
platform does not impose one universal value. Accounts and Plans are the
working examples. Append-only facts, when a real requirement needs them, use a
separate stream with their own retention policy.

## Adding an emitting domain

1. Define its contract and producer according to the [platform event
   contract](../../../README.md#event-processing).
2. Add the durable outbox table and `(queued_at, id)` index in the domain
   migration.
3. Add the domain-owned Outbox Relay deployment and `streams.json`, following
   `domains/accounts/workloads/outbox-relay/infra/` or
   `domains/plans/workloads/outbox-relay/infra/`.
4. Add the Outbox Relay image to that domain's local development configuration.
5. Verify the producer, Outbox Relay, and any projector together; a restarted
   projector must reconcile its source feed before it processes new changes.

## Check

```sh
make -C platform/runtime/outbox-relay check
```

Outbox Relay has its own CI check. Domain checks validate only their own source,
contracts, and deployment configuration.
