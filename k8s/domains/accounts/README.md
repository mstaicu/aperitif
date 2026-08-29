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
                          -> outbox -> Relay -> ACCOUNTS stream
```

| Part | Purpose |
| --- | --- |
| `api` | Create and list accounts |
| `relay` | Publish committed Accounts events |
| `migrations` | Flyway SQL |
| `contracts` | Published Accounts event package |
| `deploy` | Kubernetes workloads, including the database and migration Job |

The API exposes `GET/POST /v1/accounts`. OpenAPI is available at
`/v1/accounts/docs`.

Accounts publishes `accounts.account.changed.v1` to
`accounts.account.v1.<account-id>`. Every message carries the complete
exported Account and its monotonic `data.revision`; the stream retains one
current message per Account subject. Account creation includes its initial
owner in revision `1`. State and its outbox event are committed in one database
transaction. [Member management](../../docs/extensions/accounts/membership.md)
and [invitations](../../docs/extensions/accounts/invitations.md) are proposed
extensions.

## Work here

```sh
make -C domains/accounts check
make -C domains/accounts migrate
make -C domains/accounts deploy
make -C domains/accounts dev
```

Add schema changes as `migrations/sql/V###__description.sql`. Outbox rows stay
durable until Relay receives JetStream PubAck.
