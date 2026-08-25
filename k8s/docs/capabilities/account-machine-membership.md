# Account machine membership

Status: Proposed

## Outcome

An Account owner attaches a machine to an Account. This gives the machine
Account context; Product domains decide what it may do there.

Owner: Accounts.

## Requires

- [Machines](machines.md) for Auth-issued machine IDs.
- [Accounts](../../domains/accounts/README.md) for the Account boundary and
  event stream.

## State

Accounts stores machine membership separately from human membership:

```sql
CREATE TABLE account_machine_members (
  account_id UUID NOT NULL REFERENCES accounts(id),
  machine_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, machine_id)
);
```

One machine may belong to many Accounts; one Account may contain many
machines. `machine_id` is an Auth-issued opaque ID, not a foreign key: Auth and
Accounts have separate databases.

Accounts deliberately does not look up Auth when adding membership. An unknown
ID creates an inert membership because no machine can obtain a token for it. A
revoked machine cannot mint a new token; an earlier token follows its normal
five-minute expiry. IDs are server-generated and never reused, so a stale row
can never later identify a different machine.

## API

These routes belong to Accounts:

```text
PUT    /v1/accounts/{account_id}/machines/{machine_id}
DELETE /v1/accounts/{account_id}/machines/{machine_id}
```

They require an access token whose `sub` is an `owner` member of the Account.
A machine access token cannot meet that human-membership check.

`PUT` adds one membership and is idempotent. `DELETE` removes one membership
and is idempotent. Adding a machine grants no control over its credentials;
only its Auth manager can rotate or revoke them.

## Processing

Accounts locks the Account row, verifies the human owner, changes the canonical
membership row, increments `accounts.version`, and records the matching outbox
event in the same transaction.

## Events

Accounts publishes relationship events:

```text
accounts.machine-membership.created.v1
accounts.machine-membership.deleted.v1
```

```json
{
  "account_id": "account-456",
  "machine_id": "machine-789",
  "version": 8
}
```

Each event is the complete state of one membership relationship, not a snapshot
of every machine in the Account.

Products persist `version` and `deleted_at` for each
`(account_id, machine_id)` projection row. They apply only a newer event for
that pair. They must not use one Account-level projection version to discard a
membership event: two different machine memberships can arrive out of order.

Removing membership takes effect after each Product commits the deletion event.

## Not included

- Machine or credential lifecycle.
- Product resources, assignments, roles, or authorization rules.

## Evolution

| Stage | Strengthen | Add when |
| --- | --- | --- |
| Baseline | An owner attaches an Auth-issued ID; Products follow versioned membership events. | A controlled first product. |
| Controlled | Require a machine to use a stronger proof from [Machines](machines.md) before it performs important work; notify the Account when membership changes. | Machines operate beyond a controlled environment. |
| High assurance | Replace one-sided attachment with an explicit enrollment approval between the Account and machine manager. For operations where eventual projection removal is insufficient, enforce immediate Product-local denial in addition to the event. | A misattached or recently removed machine could cause material harm. |
