# Entitlements

Entitlements resolves the product capabilities currently available to an
account.

```text
capabilities -> grants -> entitlements
```

A capability defines something a product can enable or limit. A grant assigns
capability values to an account. Entitlements are the resolved values published
to products after all grants for the account are combined.

It does not own accounts, billing, catalogues, subscriptions, or product data.

## Runtime

```text
ACCOUNTS stream -> accounts projector -> PostgreSQL
                                      -> API
                                      -> outbox publisher -> ENTITLEMENTS stream
```

| Part                            | Purpose                                 |
| ------------------------------- | --------------------------------------- |
| `components/accounts-projector` | Remember known accounts                 |
| `components/api`                | Store grants and resolve entitlements    |
| `components/outbox-publisher`   | Publish effective entitlement snapshots |
| `components/migrations`         | Flyway SQL and its Job                  |
| `packages/contracts`            | Published Entitlements event package    |
| `infra/postgres`                | Disposable in-cluster database          |

Capability values are booleans or numbers. Each capability selects
`boolean_or`, `number_max`, or `number_sum` to combine multiple grants.

A grant is one complete set of capability values. Setting the same grant ID
again replaces its previous values. Capabilities are added through migrations.

`services/grants/grants.set.mjs` stores the grant inside the account
transaction. `services/entitlements/entitlements.resolve.mjs` reads every grant
for that account and returns the effective entitlements used by the outbox
snapshot.

The operator API has one route:

```text
PUT /v1/accounts/:account_id/grants/:grant_id
```

Products consume the published snapshot.

The domain consumes `accounts.account.created.v1` and publishes
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
