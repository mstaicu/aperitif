# Tenancy Projection Template

Use this only for domains that own account-scoped resources or need hot-path account authorization.

The consumer must handle the standard tenancy event envelope:

```json
{
  "id": "event-id",
  "subject": "tenancy.account_membership.created",
  "version": 12,
  "occurred_at": "2026-05-02T10:15:30.000Z",
  "producer": "tenancy",
  "schema_version": 1,
  "payload": {}
}
```

## Minimal Tables

```sql
CREATE TABLE processed_domain_events (
    event_id UUID PRIMARY KEY,
    producer TEXT NOT NULL,
    subject TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenancy_account_projection (
    account_id UUID PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('personal', 'organization')),
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active')),
    version BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenancy_account_membership_projection (
    account_id UUID NOT NULL
        REFERENCES tenancy_account_projection(account_id)
        ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    account_version BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, user_id)
);
```

## Consumer Rule

Handle tenancy projection events in one database transaction:

1. Validate `producer = 'tenancy'` and `schema_version = 1`.
2. Insert `event.id` into `processed_domain_events` with `ON CONFLICT DO NOTHING`.
3. If the insert returns no row, ack the message and stop; it is a duplicate delivery.
4. Apply the projection only when `event.version` is greater than the stored `tenancy_account_projection.version` for that account.
5. Commit, then ack the message.

Configure the durable tenancy projection consumer with `max_ack_pending: 1`, or use a per-account serial dispatcher. This template assumes tenancy authority events are applied in account-version order.

Do not read the tenancy database from another domain. Do not call the tenancy API synchronously for request-path authorization.
