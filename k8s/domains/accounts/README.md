# Accounts

Accounts owns the boundary under which product resources live. An account is
`individual` or `organization`, and a new account starts with its creator as an
`owner` member.

It does not own users, plans, or product data.

Membership roles are limited to `owner` and `member`. They govern the account
itself; product-specific roles remain inside product domains.

## Runtime

```text
PostgreSQL -> migrations -> API
                          -> outbox -> ACCOUNTS stream
```

| Part | Purpose |
| --- | --- |
| `components/api` | Manage accounts and generic memberships |
| `components/outbox` | Publish committed Accounts events |
| `components/migrations` | Flyway SQL and its Job |
| `packages/contracts` | Published Accounts event package |
| `infra/postgres` | Disposable in-cluster database |

The API exposes `GET/POST /v1/accounts` and owner-managed membership operations
under `/v1/accounts/:account_id/members`. OpenAPI is available at
`/v1/accounts/docs`.

Accounts publishes account creation and membership creation, update, and
deletion events. State and its outbox events are committed in one database
transaction. `data.version` is a monotonic account revision. Consumers compare
it independently for each projected account or membership resource to reject
stale snapshots.

## Work here

```sh
make -C domains/accounts check
make -C domains/accounts migrate
make -C domains/accounts deploy
make -C domains/accounts dev
```

Add schema changes as `components/migrations/sql/V###__description.sql`. Keep
PostgreSQL notifications as wake-ups only; `outbox_events` remains durable.
