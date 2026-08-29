# Account machine membership

Status: Proposed

## Outcome

An Account owner attaches a machine to an Account. This gives the machine
Account context; Product domains decide what it may do there.

Owner: Accounts.

## Requires

- [Machines](../auth/machines.md) for Auth-issued machine IDs.
- [Accounts](../../../domains/accounts/README.md) for the Account boundary.

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
membership row, and commits it in one transaction.

## Cross-domain state

The current Account resource does not represent machine memberships. This
proposal defines no Account machine-membership event yet.

If a Product needs a local, current machine-membership projection, the actual
requirement should define a separately stateful relationship resource. It needs
a stable relationship identifier, a complete current representation, a
monotonic revision, and an explicit removal lifecycle. It must not start with
`created` and `deleted` deltas or overload the Account revision. Until that
consumer exists, machine membership remains Accounts-private state.

## Not included

- Machine or credential lifecycle.
- Product resources, assignments, roles, or authorization rules.

## Evolution

| Stage | Strengthen | Add when |
| --- | --- | --- |
| Baseline | An owner attaches an Auth-issued ID. | A controlled first product. |
| Controlled | Require a machine to use a stronger proof from [Machines](../auth/machines.md) before it performs important work; notify the Account when membership changes. | Machines operate beyond a controlled environment. |
| High assurance | Replace one-sided attachment with an explicit enrollment approval between the Account and machine manager. For operations where eventual projection removal is insufficient, enforce immediate Product-local denial in addition to the event. | A misattached or recently removed machine could cause material harm. |
