# Entitlements

Entitlements answers which product capabilities an account currently has. It
combines account-level grants into a current effective snapshot.

It does not own accounts, billing, catalogues, subscriptions, or product data.

## Runtime

```text
ACCOUNTS stream -> accounts projector -> PostgreSQL
                                      -> API
                                      -> outbox publisher -> ENTITLEMENTS stream
```

| Part | Purpose |
| --- | --- |
| `components/accounts-projector` | Maintain local account authority |
| `components/api` | List definitions and grant or revoke capabilities |
| `components/outbox-publisher` | Publish effective entitlement snapshots |
| `components/migrations` | Flyway SQL, core definitions, and its Job |
| `packages/contracts` | Published Entitlements event package |
| `infra/postgres` | Disposable in-cluster database |

Entitlement values are booleans or numbers. Definitions select `boolean_or`,
`number_max`, or `number_sum` to reduce multiple grants.

The domain consumes `accounts.account.opened.v1` and publishes
`entitlements.account_entitlements.updated.v1`.

## Work here

```sh
make -C domains/entitlements check
make -C domains/entitlements migrate
make -C domains/entitlements deploy
make -C domains/entitlements dev
```

Add schema changes as `components/migrations/sql/V###__description.sql`. If a
migration changes effective capability state, write fresh outbox snapshots for
the affected accounts in that migration.
