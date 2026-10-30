# State snapshots, deltas and commands

Reference patterns for new domains, using PostgreSQL, the existing outbox relay,
and `@nats-io/jetstream`. Keep business writes, message construction and outbox
SQL inline in the service. Contracts own wire schemas and builders. Consumers
own their database effects. The relay stays the same for all three patterns.

The Account examples use the real Identity contract. The Product counter
examples define a new example contract and tables below; they are not deployed
capabilities. Copy each SQL block into the appropriate domain's migrations and
each JavaScript block into that domain's service, contract or consumer. Do not
change Identity's existing schema or streams merely to run this reference.

| Pattern  | Producer                                                   | Stream                                                   | Consumer                                                                       |
| -------- | ---------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Snapshot | Complete state; replace pending snapshot for that resource | Limits, one latest message per resource subject          | Fresh `last_per_subject` scan; atomic version upsert                           |
| Delta    | Keep every distinct change                                 | Limits, retain every change within the configured limits | Durable per projection; deduplicate and apply together                         |
| Command  | Keep every distinct request                                | WorkQueue, remove after acknowledgement                  | One durable worker group per command subject; deduplicate and execute together |

The delta and command below both increment a counter by a positive integer.
Increments commute, so arrival order does not affect their result. The operation
creates the counter if it does not exist. This explicitly avoids an ordering
dependency on a separate create message. An order-dependent operation needs a
different contract and sequencing design; this relay does not promise source
order.

## 1. Stream configuration

Use the domain relay's existing
`workloads/outbox-relay/infra/base/streams.json`. This combined array illustrates
all three patterns; normally Identity owns `IDENTITY` and Product owns its two
streams. Do not give two deployments ownership of the same stream configuration.

<!-- example: streams.json -->

```json
[
  {
    "name": "IDENTITY",
    "subjects": ["identity.account.*.*", "identity.membership.*.*"],
    "retention": "limits",
    "storage": "file",
    "num_replicas": 3,
    "discard": "new",
    "discard_new_per_subject": false,
    "max_msgs_per_subject": 1,
    "max_age": 0,
    "max_bytes": 419430400
  },
  {
    "name": "PRODUCT_DELTAS",
    "subjects": ["product.counter.delta.v1"],
    "retention": "limits",
    "storage": "file",
    "num_replicas": 3,
    "discard": "new",
    "max_age": 0,
    "max_bytes": 419430400
  },
  {
    "name": "PRODUCT_COMMANDS",
    "subjects": ["product.counter.increment.v1"],
    "retention": "workqueue",
    "storage": "file",
    "num_replicas": 3,
    "discard": "new",
    "max_age": 0,
    "max_bytes": 419430400
  }
]
```

`419430400` bytes is the existing Identity development cap, reused here as an
explicit example value, not a production capacity estimate. Before rollout,
size each stream and its replicated disk for its resource count, message sizes,
outage backlog and replay requirements. Keep three replicas locally and in
production; they require three available JetStream servers to establish the
stream, and a majority for normal operation.

With snapshot retention, replacing an existing subject is allowed even with
`discard: new`, because `discard_new_per_subject` is false. Stream-wide capacity
can still reject publication. Delta and command streams have no per-subject
message cap. `max_age: 0` disables age expiry; adding an expiry later also permits
unread messages to expire. Acknowledgements do not remove Limits messages;
WorkQueue acknowledgements do remove the corresponding commands.
See NATS [stream shaping](https://docs.nats.io/learn/jetstream/shaping-the-stream)
and [retention policies](https://docs.nats.io/learn/jetstream/retention-policies).

The existing relay reads this array at startup and adds or updates the streams.
Deploy/restart that relay after changing the JSON. An omitted property does not
necessarily reset a previous setting, and removing an object does not delete
its stream. Inspect the resulting configuration after deployment. Keep publish
acknowledgements enabled and subjects untransformed for these examples.

Reuse the existing domain relay's
[ConfigMap generation](../../domains/identity/workloads/outbox-relay/infra/base/kustomization.yaml)
and [Deployment](../../domains/identity/workloads/outbox-relay/infra/base/deployment.yaml).
They mount the JSON under `/etc/outbox-relay`; the environment overlay supplies
`NATS_STREAMS_PATH`, `NATS_URL` and `DATABASE_URL`. New event semantics require the
corresponding stream entry and producer/consumer contract, not a new relay mode.

## 2. Outbox and transaction rules

The producer domain uses the existing outbox shape:

<!-- example: outbox.sql -->

```sql
CREATE TABLE outbox_messages (
    id uuid PRIMARY KEY,
    subject text NOT NULL CHECK (subject <> ''),
    payload jsonb NOT NULL,
    headers jsonb NOT NULL DEFAULT '{}'
        CHECK (jsonb_typeof(headers) = 'object')
);
```

Every outbox `id` equals the CloudEvent `id`. Every distinct message gets a new
ID; retries of that message retain its original ID and contents. Headers contain
only strings. Do not set reserved `Nats-*` headers: the relay owns publishing
options, including `Nats-Msg-Id`.

Each producer below owns its transaction. If composing inside an existing
transaction, pass its checked-out `client` and use the body between `BEGIN` and
`COMMIT`; the caller then owns commit, rollback and release. Never substitute
separate `pool.query()` calls for a multi-statement transaction. This follows
[node-postgres's transaction API](https://node-postgres.com/features/transactions).

The relay locks an outbox row, publishes with that row's ID, waits for the broker
acknowledgement, deletes the row and commits. A crash between broker storage and
database commit can cause redelivery. Broker deduplication is time-bounded;
consumers still need the database protections below.

### CloudEvent `time` versus resource timestamps

CloudEvent `time` describes when the occurrence represented by that message
happened. It is optional in the
[CloudEvents standard](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#time).
The following is the proposed policy for contracts that add it; the runnable
examples do not add top-level `time` to the current contracts.

| Message                 | Meaning of top-level `time`                                                    | What it does not mean                                                         |
| ----------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| State snapshot          | When the producer captured that complete snapshot.                             | The resource's original creation time, or necessarily its last mutation time. |
| Delta / historical fact | When the described business change occurred, according to the source contract. | When the relay eventually published it.                                       |
| Command                 | When the producer first durably recorded the request.                          | When a worker eventually executed it.                                         |

The producer chooses and validates the timestamp, then stores the entire message
in the outbox. Publication retries preserve its `id`, `time` and contents. The
relay does not generate or overwrite event time. A command's resulting fact is
a different event with its own occurrence time.

For example, an account created at 09:00 and renamed at 09:10 may produce a new
snapshot with `time` 09:10 and `data.created_at` 09:00. Publication at 09:30 changes
neither value. A deliberate fresh snapshot/reseed at 10:00 gets a new message ID
and capture time, while retaining the same resource creation time and current
version. A request recorded at 09:20 and executed at 09:25 keeps command `time`
09:20; the resulting delta has its own `time` 09:25.

Snapshot `data.created_at` comes from the source row and remains stable across
updates and reseeds. Snapshot consumers compare resource versions, not these
timestamps. Analytics records its own `ingested_at` separately. A source-recorded
transaction timestamp is not a promise of the exact database commit instant.

## 3. State snapshot

### Producer: update the resource and replace its pending snapshot

This extends the pattern in the existing
[Account creation service](../../domains/identity/workloads/api/src/services/accounts/create.mjs).
The `UPDATE` locks the resource and increments its version before replacing the
pending outbox row. Concurrent writers of this resource must follow that same
locking rule. Use ordinary PostgreSQL `READ COMMITTED` transactions here; retry
the whole operation if using a stricter isolation level that reports a conflict.

<!-- example: rename-account.mjs -->

```javascript
import {
  buildAccountSnapshotV1,
  buildAccountV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";

export async function renameAccount({ pool }, { accountId, name }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      rows: [account],
    } = await client.query(
      `
        UPDATE accounts
        SET name = $2, version = version + 1
        WHERE id = $1
        RETURNING id, name, created_at, version
      `,
      [accountId, name],
    );

    if (!account) throw new Error("ACCOUNT_NOT_FOUND");

    const event = buildAccountSnapshotV1({
      created_at: account.created_at.toISOString(),
      id: account.id,
      name: account.name,
      version: Number(account.version),
    });
    const subject = buildAccountV1Subject(account.id);
    const headers = { "Content-Type": "application/cloudevents+json" };
    propagation.inject(context.active(), headers);

    await client.query(
      `
        DELETE FROM outbox_messages
        WHERE subject = $1
      `,
      [subject],
    );

    await client.query(
      `
        INSERT INTO outbox_messages (id, subject, payload, headers)
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
      `,
      [event.id, subject, event, headers],
    );

    await client.query("COMMIT");
    return event.data;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
```

The contract rejects versions outside JavaScript's safe integer range; conversion
must not silently publish a rounded version. A rejected build rolls back the
resource update. Keep versions positive and monotonically increasing across all
writes to the resource.

The subject is `identity.account.v1.<account-id>`. Do not add an event ID or
version to it: that would turn each version into a different retained resource.
Dedicate this subject to that resource's snapshots.

The pending invariant is **at most one committed, unpublished snapshot per
resource subject**. If the relay holds the older row lock, the producer's delete
waits. If the relay has committed its deletion, there is nothing left to delete.
The new complete state can then be inserted. Do not append several pending
snapshots and expect JetStream to compare their payload versions.

The relay's last-subject-sequence check guards conflicting publication attempts;
it does not inspect resource versions or replace producer coalescing.

### Consumer: fresh scan and atomic version comparison

In the consuming domain's database:

<!-- example: account-projection.sql -->

```sql
CREATE TABLE identity_accounts (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    version bigint NOT NULL CHECK (version > 0)
);
```

<!-- example: project-account.mjs -->

```javascript
import {
  buildAccountV1Subject,
  isAccountSnapshotV1,
} from "@mstaicu/identity-contracts";

export async function projectAccount({ pool }, message) {
  const event = message.json();

  if (
    !isAccountSnapshotV1(event) ||
    message.subject !== buildAccountV1Subject(event.data.id)
  ) {
    throw new Error("INVALID_ACCOUNT_SNAPSHOT");
  }

  await pool.query(
    `
      INSERT INTO identity_accounts (id, name, version)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, version = EXCLUDED.version
      WHERE identity_accounts.version < EXCLUDED.version
    `,
    [event.data.id, event.data.name, event.data.version],
  );
}
```

The single statement commits both the comparison and write atomically, including
when workers overlap. Duplicate or older snapshots are successful no-ops. There
is no processed-message table for this projection.

Create a fresh ephemeral pull consumer each time this worker starts:

<!-- example: account-consumer.mjs -->

```javascript
import { AckPolicy, DeliverPolicy } from "@nats-io/jetstream";

export async function accountConsumer({ js, jsm }) {
  const info = await jsm.consumers.add("IDENTITY", {
    ack_policy: AckPolicy.Explicit,
    deliver_policy: DeliverPolicy.LastPerSubject,
    filter_subject: "identity.account.v1.*",
    inactive_threshold: 300_000_000_000,
  });

  return js.consumers.get("IDENTITY", info.name);
}
```

There is no durable name. Each restart scans the retained latest snapshots and
then follows new ones. The five-minute inactivity cleanup is a worker-lifecycle
example value, not message retention. Explicit acknowledgements let processing
fail before marking a delivery handled; use the worker loop below.

A durable consumer is optional if resuming instead of rescanning becomes useful.
If its projection database is lost, create a fresh consumer or explicitly reset
its position: the old acknowledgement position does not rebuild an empty table.

This produces eventually consistent state, not delivery of every transition or
a transactionally consistent snapshot across resources. An empty scan is not a
business readiness guarantee. If reads require a complete initial projection,
gate those reads until your bootstrap protocol establishes that completeness.
Identity does not yet define deletion events. A future deletion contract needs a
versioned retained tombstone; silently removing a stream message cannot tell an
offline projection to remove its database row.

## 4. Delta

### Contract: a distinct counter increment

The following module is a complete example contract for the delta and its
matching command. It uses TypeBox like the existing contracts. In a real domain,
keep each message's public schema, builder and validator together and export
them through the contracts package. There is no SQL or NATS client here.

The deliberately closed envelopes accept only their declared attributes. Adding
optional CloudEvents attributes requires their proper types and validation;
accepting arbitrary extension values is not validation of standard attributes.

<!-- example: counter-contracts.mjs -->

```javascript
import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { Compile } from "typebox/compile";

const uuid = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-7][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});
const data = Type.Object(
  {
    counter_id: uuid,
    amount: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
  },
  { additionalProperties: false },
);

export const CounterIncrementedV1Schema = Type.Object(
  {
    specversion: Type.Literal("1.0"),
    source: Type.Literal("/domains/product"),
    type: Type.Literal("product.counter.incremented.v1"),
    id: uuid,
    data,
  },
  { additionalProperties: false },
);

export const IncrementCounterV1Schema = Type.Object(
  {
    specversion: Type.Literal("1.0"),
    source: Type.Literal("/domains/product"),
    type: Type.Literal("product.counter.increment.requested.v1"),
    id: uuid,
    data,
  },
  { additionalProperties: false },
);

const delta = Compile(CounterIncrementedV1Schema);
const command = Compile(IncrementCounterV1Schema);

export const isCounterIncrementedV1 = (event) => delta.Check(event);
export const isIncrementCounterV1 = (event) => command.Check(event);

export function buildCounterIncrementedV1(data) {
  const event = {
    specversion: "1.0",
    source: "/domains/product",
    type: "product.counter.incremented.v1",
    id: randomUUID(),
    data: { ...data },
  };
  if (!isCounterIncrementedV1(event)) throw new Error("INVALID_COUNTER_DELTA");
  return event;
}

export function buildIncrementCounterV1(id, data) {
  const event = {
    specversion: "1.0",
    source: "/domains/product",
    type: "product.counter.increment.requested.v1",
    id,
    data: { ...data },
  };
  if (!isIncrementCounterV1(event)) throw new Error("INVALID_COUNTER_COMMAND");
  return event;
}
```

The fixed subjects carry different resources in their payloads:

| Message | NATS subject                   | Resource ID       |
| ------- | ------------------------------ | ----------------- |
| Delta   | `product.counter.delta.v1`     | `data.counter_id` |
| Command | `product.counter.increment.v1` | `data.counter_id` |

### Producer: business change and delta in one transaction

In the counter owner's database:

<!-- example: counters.sql -->

```sql
CREATE TABLE counters (
    id uuid PRIMARY KEY,
    value numeric NOT NULL CHECK (value >= 0 AND value = trunc(value))
);
```

`numeric` avoids overflowing a JavaScript number when many increments accumulate.
Read accumulated totals as decimal strings rather than converting them to Number.

<!-- example: increment-counter.mjs -->

```javascript
import { context, propagation } from "@opentelemetry/api";
import { buildCounterIncrementedV1 } from "./counter-contracts.mjs";

export async function incrementCounter({ pool }, { counterId, amount }) {
  const event = buildCounterIncrementedV1({ counter_id: counterId, amount });
  const headers = { "Content-Type": "application/cloudevents+json" };
  propagation.inject(context.active(), headers);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO counters (id, value)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE
        SET value = counters.value + EXCLUDED.value
      `,
      [counterId, amount],
    );

    await client.query(
      `
        INSERT INTO outbox_messages (id, subject, payload, headers)
        VALUES ($1, 'product.counter.delta.v1', $2::jsonb, $3::jsonb)
      `,
      [event.id, event, headers],
    );

    await client.query("COMMIT");
    return { eventId: event.id };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
```

There is no outbox deletion here. Calling this operation twice means two business
increments. If a caller can retry the same request, use the idempotent command
admission pattern in section 5, or a business uniqueness constraint in this same
transaction. Relay retries do not call the producer again.

### Consumer: deduplicate and apply together

In the projecting domain's database:

<!-- example: counter-projection.sql -->

```sql
CREATE TABLE counter_totals (
    id uuid PRIMARY KEY,
    value numeric NOT NULL CHECK (value >= 0 AND value = trunc(value))
);

CREATE TABLE processed_messages (
    consumer text NOT NULL,
    source text NOT NULL,
    id uuid NOT NULL,
    PRIMARY KEY (consumer, source, id)
);
```

The consumer key identifies a logical database effect, shared by all its worker
replicas. Different projections use different keys. CloudEvents identity is
`source` plus `id`; NATS sequence and resource ID are not deduplication keys.

<!-- example: project-counter.mjs -->

```javascript
import { isCounterIncrementedV1 } from "./counter-contracts.mjs";

export async function projectCounter({ pool }, message) {
  const event = message.json();
  if (
    message.subject !== "product.counter.delta.v1" ||
    !isCounterIncrementedV1(event)
  )
    throw new Error("INVALID_COUNTER_DELTA");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const inserted = await client.query(
      `
        INSERT INTO processed_messages (consumer, source, id)
        VALUES ('counter-totals-v1', $1, $2)
        ON CONFLICT DO NOTHING
        RETURNING id
      `,
      [event.source, event.id],
    );

    if (inserted.rowCount) {
      await client.query(
        `
          INSERT INTO counter_totals (id, value)
          VALUES ($1, $2)
          ON CONFLICT (id) DO UPDATE
          SET value = counter_totals.value + EXCLUDED.value
        `,
        [event.data.counter_id, event.data.amount],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
```

Provision one durable for this projection, then have all its replicas bind to it:

<!-- example: delta-consumer.mjs -->

```javascript
import { AckPolicy, DeliverPolicy } from "@nats-io/jetstream";

export async function deltaConsumer({ js, jsm }) {
  await jsm.consumers.add("PRODUCT_DELTAS", {
    durable_name: "counter-totals-v1",
    ack_policy: AckPolicy.Explicit,
    deliver_policy: DeliverPolicy.All,
    filter_subject: "product.counter.delta.v1",
  });

  return js.consumers.get("PRODUCT_DELTAS", "counter-totals-v1");
}
```

Creating this durable again with the same configuration preserves its position.
An incompatible configuration should fail startup, not silently delete/reset the
consumer. Another domain's independent projection gets its own durable.

Every distinct delta contributes exactly once to this SQL projection even if
deliveries duplicate or reorder. Do not skip a delta because another delta has a
larger version. Starting from zero only reconstructs a total if the stream still
contains the complete history; otherwise use an authoritative baseline and a
coordinated catch-up protocol. Do not independently combine a snapshot total and
arbitrary retained deltas, which would double-count changes.

## 5. Command

### Producer: persist admission under a stable request ID

The caller generates one UUID for a logical request and reuses it when retrying.
The authenticated route authorizes access to the counter before invoking the
service; a UUID alone grants no authority. Scope request keys to the caller if
the public API's idempotency contract requires that scope.

In the requesting domain's database, alongside its outbox:

<!-- example: counter-requests.sql -->

```sql
CREATE TABLE counter_increment_requests (
    id uuid PRIMARY KEY,
    counter_id uuid NOT NULL,
    amount bigint NOT NULL CHECK (amount BETWEEN 1 AND 9007199254740991)
);
```

<!-- example: request-increment.mjs -->

```javascript
import { context, propagation } from "@opentelemetry/api";
import { buildIncrementCounterV1 } from "./counter-contracts.mjs";

export async function requestIncrement(
  { pool },
  { requestId, counterId, amount },
) {
  const event = buildIncrementCounterV1(requestId, {
    counter_id: counterId,
    amount,
  });
  const headers = { "Content-Type": "application/cloudevents+json" };
  propagation.inject(context.active(), headers);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inserted = await client.query(
      `
        INSERT INTO counter_increment_requests (id, counter_id, amount)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING id
      `,
      [requestId, counterId, amount],
    );

    if (inserted.rowCount) {
      await client.query(
        `
          INSERT INTO outbox_messages (id, subject, payload, headers)
          VALUES ($1, 'product.counter.increment.v1', $2::jsonb, $3::jsonb)
        `,
        [event.id, event, headers],
      );
    } else {
      const {
        rows: [previous],
      } = await client.query(
        `
          SELECT counter_id, amount
          FROM counter_increment_requests
          WHERE id = $1
        `,
        [requestId],
      );
      if (
        previous.counter_id !== counterId.toLowerCase() ||
        previous.amount !== String(amount)
      )
        throw new Error("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT");
    }

    await client.query("COMMIT");
    return { requestId, accepted: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
```

Retrying after the relay has deleted the outbox row still does not create another
command: the admission record remains. An accepted response means durably queued,
not executed. Retain admission records for the promised request-idempotency
period; deleting them allows a later retry to become a new command.

The example command source is fixed to `/domains/product`. A different requesting
domain needs an explicitly supported command source in its public contract and
broker permissions; do not spoof Product's source. Payload validation does not
authenticate a publisher.

### Consumer: execute once and publish the resulting delta atomically

The counter owner's database needs `counters`, `outbox_messages` and the same
`processed_messages` table shape shown above. These are its own tables, not
cross-domain database reads. A command changes authoritative state; the emitted
delta reports the change to any interested projection.

<!-- example: handle-increment.mjs -->

```javascript
import { context, propagation } from "@opentelemetry/api";
import {
  buildCounterIncrementedV1,
  isIncrementCounterV1,
} from "./counter-contracts.mjs";

export async function handleIncrement({ pool }, message) {
  const command = message.json();
  if (
    message.subject !== "product.counter.increment.v1" ||
    !isIncrementCounterV1(command)
  )
    throw new Error("INVALID_COUNTER_COMMAND");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const inserted = await client.query(
      `
        INSERT INTO processed_messages (consumer, source, id)
        VALUES ('increment-counter-v1', $1, $2)
        ON CONFLICT DO NOTHING
        RETURNING id
      `,
      [command.source, command.id],
    );

    if (inserted.rowCount) {
      await client.query(
        `
          INSERT INTO counters (id, value)
          VALUES ($1, $2)
          ON CONFLICT (id) DO UPDATE
          SET value = counters.value + EXCLUDED.value
        `,
        [command.data.counter_id, command.data.amount],
      );

      const delta = buildCounterIncrementedV1(command.data);
      const headers = { "Content-Type": "application/cloudevents+json" };
      propagation.inject(context.active(), headers);

      await client.query(
        `
          INSERT INTO outbox_messages (id, subject, payload, headers)
          VALUES ($1, 'product.counter.delta.v1', $2::jsonb, $3::jsonb)
        `,
        [delta.id, delta, headers],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
```

<!-- example: command-consumer.mjs -->

```javascript
import { AckPolicy, DeliverPolicy } from "@nats-io/jetstream";

export async function commandConsumer({ js, jsm }) {
  await jsm.consumers.add("PRODUCT_COMMANDS", {
    durable_name: "increment-counter-v1",
    ack_policy: AckPolicy.Explicit,
    deliver_policy: DeliverPolicy.All,
    filter_subject: "product.counter.increment.v1",
  });

  return js.consumers.get("PRODUCT_COMMANDS", "increment-counter-v1");
}
```

All worker replicas share that durable. WorkQueue does not allow another
overlapping consumer to independently execute the same command subjects. Use
the resulting delta stream for observers. Commands may be redelivered, so the
database uniqueness constraint is still required.

This example's effect is entirely transactional SQL. For payments, email or
other external effects, a local processed-message row cannot make the external
call atomic. Use that provider's stable idempotency key or another outbox and
an explicit recovery protocol. A business rejection should be committed as a
result and then acknowledged; do not retry a permanent rejection forever.

## 6. Worker lifecycle and acknowledgement

Use this loop with any one of the consumer factories and handlers above. It is
ordinary worker code local to a domain, not another required shared package.
The handler returns only after its database commit; the loop then acknowledges.

<!-- example: run-consumer.mjs -->

```javascript
export async function runConsumer({ consumer, handle, signal }) {
  const messages = await consumer.consume({ max_messages: 1 });
  const stop = () => messages.stop();
  signal.addEventListener("abort", stop, { once: true });
  if (signal.aborted) stop();

  try {
    for await (const message of messages) {
      try {
        await handle(message);
        message.ack();
      } catch (error) {
        console.error({
          subject: message.subject,
          streamSequence: message.info.streamSequence,
          error,
        });
        throw error;
      }
    }

    // consume() can close itself on a terminal connection/consumer error.
    const error = await messages.closed();
    if (error) throw error;
    if (!signal.aborted) throw new Error("CONSUMER_STOPPED_UNEXPECTEDLY");
  } finally {
    signal.removeEventListener("abort", stop);
    stop();
  }
}
```

For example, the delta worker entry point is:

<!-- example: counter-worker.mjs -->

```javascript
import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { Pool } from "pg";
import { deltaConsumer } from "./delta-consumer.mjs";
import { projectCounter } from "./project-counter.mjs";
import { runConsumer } from "./run-consumer.mjs";

const abortController = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => abortController.abort());
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on("error", (error) => {
  console.error(error);
  abortController.abort();
});

try {
  await using nc = await connect({ servers: process.env.NATS_URL });
  nc.closed().then(() => abortController.abort());
  const js = jetstream(nc);
  const jsm = await jetstreamManager(nc);
  const consumer = await deltaConsumer({ js, jsm });

  await runConsumer({
    consumer,
    handle: (message) => projectCounter({ pool }, message),
    signal: abortController.signal,
  });
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
```

For a snapshot worker, substitute `accountConsumer` and `projectAccount`. For a
command worker, substitute `commandConsumer` and `handleIncrement`. Keep the
worker deployment under a restart supervisor, such as Kubernetes's default
Deployment restart policy. The entry point uses the repository's Node runtime
and native NATS/pg libraries; pin the domain's contract dependency as Identity
does today. The Product examples' local contract imports stand in for that
domain's published contracts package.

On SIGTERM, pulling stops and the current handler finishes before connection
disposal. If the process is killed before commit, SQL rolls back; if killed after
commit but before acknowledgement, redelivery is a safe no-op. Give the process
enough termination grace for its database work, and configure database deadlines
to bound that work. These handlers do not buffer a large batch while doing
sequential SQL.

No custom retry engine is needed here. Leave native acknowledgement/redelivery
defaults unless the handler's measured duration requires a change. A late
acknowledgement can cause concurrent delivery; database idempotency still
protects the effect. For deliberately long processing, arrange periodic
`message.working()` calls within a bounded processing deadline, or adjust the
consumer's acknowledgement wait. See NATS
[acknowledgement and redelivery](https://docs.nats.io/learn/jetstream/acknowledgment)
and the [JavaScript consumer API](https://nats-io.github.io/nats.js/jetstream/index.html).

Malformed messages and database errors leave the delivery unacknowledged and
fail the worker visibly. They are not silently acknowledged, terminated or
skipped. Fix a permanent poison message through an explicit operational
procedure; otherwise it will continue failing. A capacity-rejected outbox row is
likewise preserved by the existing relay. Watch for publication or consumer
progress stopping, not only a running process.

Keep processed-message records at least as long as any possible redelivery or
replay. Broker duplicate windows do not determine that period. Restoring a
projection from zero requires a coordinated reset of its deduplication records
and consumer position. After a WorkQueue command is acknowledged and removed,
the stream alone cannot reconstruct a lost authoritative database; back up that
database. Current-state feeds likewise require source reseeding if their retained
broker state is lost.

## 7. Verify a new domain before rollout

These Markdown code blocks were extracted and exercised on 2026-10-30 using the
actual repository relay, Identity contracts 0.3.0, `@nats-io/jetstream` 3.4.0 and `pg`
8.23.1. All 17 checks passed against PostgreSQL 18.6 and three NATS 2.14.5 servers
with three-replica streams, running Node 26.11.1. This was an isolated Docker
integration check, not a Kubernetes deployment check.

Checks included concurrent snapshot producers and four relay workers, fresh
projection rebuild, concurrent duplicate delta delivery, transactional rollback,
concurrent command admission, commit-before-ack redelivery, the documented worker
entry point and SIGTERM, capacity rejection, and recovery after all three brokers
were paused. The redelivery checks temporarily shortened the test consumers'
acknowledgement timers. Broker recovery allowed repeated relay process attempts
while JetStream recovered, matching the deployment's restart policy.

Run the domain's normal `make -C domains/<domain> check`, then exercise its real
outbox, relay and consumers against a three-server JetStream cluster:

| Exercise                                                | Required observation                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Two snapshot updates while publication is stopped       | One pending row for the subject, containing the latest version                   |
| Concurrent source updates and relay workers             | Retained state eventually equals the source's latest complete snapshot           |
| Older/duplicate snapshot after a newer projection write | Projection does not regress                                                      |
| Snapshot worker restart or projection rebuild           | Fresh scan supplies retained current state without requiring a durable           |
| Several distinct delta rows sharing one subject         | Every amount contributes, including reordered delivery                           |
| Duplicate delivery, including simultaneous workers      | One SQL effect per `(consumer, source, id)`                                      |
| SQL failure after deduplication insert                  | Deduplication and business effect both roll back                                 |
| Worker stops after commit but before acknowledgement    | Redelivery changes neither totals nor resulting event count                      |
| Repeated command admission with the same request ID     | One durable admission and one command; changed input is rejected                 |
| Command execution                                       | Source counter, deduplication row and resulting delta commit together            |
| Command acknowledged, then another command published    | Queue can drain to zero and accept subsequent commands                           |
| Broker outage or full stream                            | Unpublished rows remain; recovery resumes publication without changing event IDs |

The examples are deliberately additive and version-aware. Passing these checks
does not establish source ordering for a different, order-dependent contract.
