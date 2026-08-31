# Accounts

Accounts owns the ownership boundary for product resources.

- An Account is `individual` or `organization`.
- Creating an Account creates its first `owner` membership in the same database
  transaction.
- Account roles are only `owner` and `member`; product roles belong in the
  product domain that needs them.
- Accounts does not own users, plans, payments, or product resources.

## Implemented workloads

```text
PostgreSQL -> migrations -> API
                          -> outbox -> Outbox Relay -> ACCOUNTS
```

| Workload | Responsibility |
| --- | --- |
| `postgres` | Accounts' current local PostgreSQL instance |
| `migrations` | Flyway schema changes |
| `api` | Create and list Accounts; serve OpenAPI |
| `outbox-relay` | Publish committed Account representations |
| `contracts` | Published Accounts resource-feed package |

The API exposes `GET /v1/accounts` and `POST /v1/accounts`; OpenAPI is at
`/v1/accounts/docs`.

## Account state feed

Accounts publishes one complete current Account representation per Account:

```text
subject: accounts.account.v1.<account-id>
type:    accounts.account.changed.v1
stream:  ACCOUNTS
```

Creation publishes revision `1`, including the initial owner. The Account state
and outbox row commit together. `ACCOUNTS` retains one current message per
Account subject, allowing a later domain to bootstrap a local projection.

[Membership](../../docs/extensions/accounts/membership.md) and
[invitations](../../docs/extensions/accounts/invitations.md) are proposed
documentation, not implemented endpoints. When a future mutation changes
exported Account state, it must increment the Account revision, write the
complete new representation, and replace an unpublished older snapshot for that
Account subject in the same transaction.

## Work here

```sh
make -C domains/accounts check
make -C domains/accounts migrate
make -C domains/accounts deploy
make -C domains/accounts dev
```

Add schema changes as `workloads/migrations/sql/V###__description.sql`.
Outbox rows remain durable until Relay receives JetStream PubAck.
