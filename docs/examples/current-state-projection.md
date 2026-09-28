# Current-state projection

Status: Illustrative.

This is the pattern for exporting a resource's current representation to another
domain. It is not event sourcing, a command queue, or an audit log.

```text
source transaction
  → outbox row
    → Relay publication
      → one retained state per resource
        → consumer transaction
          → acknowledgement
```

A product consumes another domain's current-state feed only when it needs that
state for its own local decisions. It validates the producer's exact contract,
stores only the fields it needs, and never queries the producer database.

A product can use the initialization form of this pattern: create its local
commercial state once for each Account snapshot, then leave a later customer
choice unchanged on replay. The versioned projection below is for a product that
makes routine authorization decisions from Account membership.

## Source

A source exports one complete resource representation on one stable subject. It
increments that resource's positive monotonic version whenever the exported
representation changes.

```text
subject: accounts.membership.v1.<membership-id>
type:    accounts.membership.snapshot.v1
data:    id, account_id, subject_id, role, status, version
```

The source writes its state and its outbox row in the same database transaction.
For a current-state subject, it replaces an older unpublished outbox row before
inserting the newer one. The Relay later removes the row only after JetStream
acknowledges publication.

The source must not:

- publish a delta as though it were a snapshot;
- reuse a resource identifier;
- publish different data for the same resource version; or
- put secrets, invitation tokens, credentials, or unnecessary personal data in
  the exported representation.

A removal remains a complete final representation. Membership uses
`status: inactive`; a future resource that can be closed or deleted needs an
equivalent retained state or tombstone. Deleting its only stream message would
leave new consumers unable to learn that it disappeared.

## Stream

A state stream retains one message per resource subject:

```text
retention:            limits
storage:              file
max_msgs_per_subject: 1
```

This makes a new consumer reconstruct the latest state without replaying every
transition. It is deliberately unsuitable for audit history. A product that
needs a permanent business history or a command must define a separate,
immutable message and make its consumer idempotent by event ID or business key.

The Relay uses the outbox event ID as the NATS message ID and guards publication
with the stream's last sequence for that subject. A delayed older snapshot cannot
replace a newer retained snapshot. The source database and JetStream are not one
transaction, so delivery remains at least once; exact-once claims would be
incorrect.

## Consumer

The workload pins an exact `@mstaicu/accounts-contracts` version. It creates an
explicit-ack JetStream consumer for:

```text
stream:         ACCOUNTS
filter_subject: accounts.membership.v1.*
deliver_policy: DeliverLastPerSubject
ack_policy:     Explicit
```

An ephemeral consumer is correct for this state pattern. On restart it requests
the latest representation for every subject again. A durable consumer is useful
only when the product deliberately needs shared delivery state across worker
replicas.

The product stores only the remote state it needs:

```sql
CREATE TABLE account_membership_state (
    membership_id UUID PRIMARY KEY,
    account_id UUID NOT NULL,
    subject_id TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    source_version BIGINT NOT NULL CHECK (source_version > 0),

    UNIQUE (account_id, subject_id)
);
```

`source_version` is the producer's `data.version`, not a version invented by the
consumer.

Validate both the CloudEvent and its NATS subject before opening a transaction:

```js
const snapshot = message.json();

if (!isMembershipSnapshotV1(snapshot)) {
  throw new Error("INVALID_MEMBERSHIP_SNAPSHOT_EVENT");
}

if (message.subject !== buildMembershipV1Subject(snapshot.data.id)) {
  throw new Error("MEMBERSHIP_V1_SUBJECT_MISMATCH");
}
```

Then write only a newer representation. Acknowledge only after commit:

```js
const { id, account_id, role, status, subject_id, version } = snapshot.data;
const client = await pool.connect();

try {
  await client.query("BEGIN");

  await client.query(
    `
      INSERT INTO account_membership_state (
        membership_id,
        account_id,
        subject_id,
        role,
        status,
        source_version
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (membership_id) DO UPDATE
      SET account_id = EXCLUDED.account_id,
        subject_id = EXCLUDED.subject_id,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        source_version = EXCLUDED.source_version
      WHERE account_membership_state.source_version < EXCLUDED.source_version
    `,
    [id, account_id, subject_id, role, status, version],
  );

  await client.query("COMMIT");
  message.ack();
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  client.release();
}
```

Product authorization requires an active Membership, then applies its own
resource permission and scopes every product query by `account_id`:

```sql
SELECT role
FROM account_membership_state
WHERE account_id = $1
  AND subject_id = $2
  AND status = 'active';
```

Account membership says that a subject belongs to an Account. It does not grant
access to every resource in that Account.

## Edge cases

| Situation | Required behavior |
| --- | --- |
| A consumer commits, then dies before acknowledgement | JetStream redelivers. The source-version write is a no-op. |
| Version 7 arrives before version 6 | Keep version 7. Never order state by CloudEvent time. |
| Equal version carries different data | Reject and alert: the producer violated its contract. |
| A Membership arrives before its Account representation | Project each resource independently. Do not require cross-subject ordering. |
| A Membership becomes inactive | Keep the row and deny authorization. Do not delete it. |
| A message fails validation or has a mismatched NATS subject | Do not acknowledge it. Fail the projector and alert rather than silently authorizing from stale state. |
| The consumer database is unavailable | Roll back and do not acknowledge; delivery retries after recovery. |
| Relay or JetStream is unavailable | The source transaction still commits with its outbox row. Relay resumes publication later. |
| Relay publishes but dies before deleting its outbox row | A later attempt can publish again. State consumers tolerate it through source version. Command consumers need event or business-key idempotency. |
| A stream reaches capacity | `discard: new` preserves existing current state and rejects new publication. Monitor stream bytes and Relay failures before capacity is reached. |
| A projector starts cold | It must not report ready until its initial `DeliverLastPerSubject` state has drained. Until then, an empty projection can cause false denials. |
| A Membership is revoked | Routine authorization sees revocation after propagation. For an operation that needs an immediate authoritative answer, make a narrow synchronous check at that operation boundary. |
| The projector is scaled | One projector replica is simplest for one shared projection database. Scaling requires one shared durable consumer and idempotent local effects. |
| One state update needs to change several resources atomically | Do not infer a global event order. Export one combined resource if consumers require one atomic representation. |
| The wire contract changes | Publish a new event type and contract version. Keep the prior type while live consumers migrate. |

An invalid current-state message is not a dead-letter candidate by default. A
skipped message makes the projection silently stale. Fail, alert, correct the
producer or contract, and let the retained current representation recover the
consumer.

## Product projection tests

The first real consumer should have focused integration coverage for these
behaviors:

1. A newer version survives a later older delivery.
2. A committed write redelivered before acknowledgement creates no duplicate
   local or outgoing effect.
3. An inactive Membership denies access.
4. Membership and Account state can arrive in either order.
5. The workload remains unready until its first current-state load completes.

Do not test broker internals or build a generic projection framework. Test the
product's local authority boundary and its consequences.
