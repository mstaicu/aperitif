# Accounts

Accounts owns the boundary under which product resources live. An account is
`personal` or `business`, and a new account starts with its creator as an
`owner` member.

It does not own users, entitlement grants, or product data.

Membership roles are limited to `owner`, `admin`, and `member`. They govern the
account itself; product-specific roles remain inside product domains.

## Runtime

```text
PostgreSQL -> migrations -> API
                          -> outbox publisher -> ACCOUNTS stream
```

| Part | Purpose |
| --- | --- |
| `components/api` | Create and list the caller's accounts |
| `components/outbox-publisher` | Publish committed Accounts events |
| `components/migrations` | Flyway SQL and its Job |
| `packages/contracts` | Published Accounts event package |
| `infra/postgres` | Disposable in-cluster database |

The API exposes `GET/POST /v1/accounts` and OpenAPI at
`/v1/accounts/docs`.

Accounts publishes `accounts.account.created.v1`. State and its outbox event are
committed in one database transaction. `data.version` is the account state
version used by projectors to reject stale events.

## Work here

```sh
make -C domains/accounts check
make -C domains/accounts migrate
make -C domains/accounts deploy
make -C domains/accounts dev
```

Add schema changes as `components/migrations/sql/V###__description.sql`. Keep
PostgreSQL notifications as wake-ups only; `outbox_events` remains durable.
