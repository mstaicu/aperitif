# Plans

Plans owns the reusable pricing matrix for account-level product access:

```text
features -> plans -> account plan -> feature snapshot
```

A feature has a stable ID. A plan assigns each included feature a boolean,
number, or string value. An account has one current plan. Products consume the
resolved feature values and never branch on a plan name.

An account without an assigned plan has no plan-derived features. No default
plan is implied.

Plans does not own accounts, payments, compliance decisions, or product data.

## Runtime

```text
ACCOUNTS stream -> accounts projector -> PostgreSQL
                                      -> API
                                      -> outbox publisher -> PLANS stream
```

| Part                            | Purpose                              |
| ------------------------------- | ------------------------------------ |
| `components/accounts-projector` | Remember known accounts              |
| `components/api`                | Assign plans and resolve features    |
| `components/outbox-publisher`   | Publish account feature snapshots    |
| `components/migrations`         | Flyway SQL and its Job               |
| `packages/contracts`            | Published Plans event package        |
| `infra/postgres`                | Disposable in-cluster database       |

Plans and their feature values are product configuration added through
migrations. The operator API has one route:

```text
PUT /v1/accounts/:account_id/plan
```

```json
{
  "plan_id": "pro"
}
```

The domain consumes `accounts.account.created.v1` and publishes
`plans.account.features.updated.v1`.

## Work here

```sh
make -C domains/plans check
make -C domains/plans migrate
make -C domains/plans deploy
make -C domains/plans dev
```

Add schema changes as `components/migrations/sql/V###__description.sql`. If a
migration changes a plan used by existing accounts, write fresh feature
snapshots for those accounts in that migration.
