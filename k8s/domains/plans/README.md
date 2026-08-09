# Plans

Plans owns the reusable pricing matrix for account-level product access:

```text
features -> plans -> account plan -> feature snapshot
```

A feature has a stable ID. A plan assigns each included feature a boolean,
number, or string value. An account has one current plan and can override
individual feature values. Products consume the resolved feature values and
never branch on a plan name.

Every projected account starts on the seeded `free` plan. Plans publishes its
initial feature snapshot at version `1`.

Plans does not own accounts, payments, compliance decisions, or product data.

## Runtime

```text
ACCOUNTS stream -> accounts projection -> PostgreSQL
                                       -> API
                                       -> outbox -> PLANS stream
```

| Part | Purpose |
| --- | --- |
| `components/accounts-projection` | Remember known accounts and assign their initial plan |
| `components/api` | Assign plans and resolve features |
| `components/outbox` | Publish account feature snapshots |
| `components/migrations` | Flyway SQL and its Job |
| `packages/contracts` | Published Plans event package |
| `infra/postgres` | Disposable in-cluster database |

Plans and their feature values are product configuration added through
migrations. The operator API exposes:

```text
PUT /v1/accounts/:account_id/plan
PUT /v1/accounts/:account_id/overrides/:feature_id
DELETE /v1/accounts/:account_id/overrides/:feature_id
```

```json
{
  "plan_id": "pro"
}
```

```json
{
  "value": 200
}
```

An override replaces the plan value for that feature and can also add a
feature absent from the plan. Deleting it restores the plan value or removes
the feature. An account must have a plan before it can have overrides.

The domain consumes `accounts.account.created.v1` and publishes
`plans.account.features.updated.v1`.

## Work here

```sh
make -C domains/plans check
make -C domains/plans migrate
make -C domains/plans deploy
make -C domains/plans dev
```

Add schema and configuration changes as
`components/migrations/sql/V###__description.sql`.

If a migration changes an account's effective features, it must also increment
that account's plan version and insert a complete feature snapshot into the
outbox. The matrix update, versions, and outbox rows belong in one transaction.

| Change | Publish snapshots? |
| --- | --- |
| Add or rename a plan | No |
| Add or rename a feature definition | No |
| Change a plan with no assigned accounts | No |
| Add, change, or remove a feature from a plan with assigned accounts | Yes |
| Assign an account to a plan through the API | Handled by the API |

The rule is simple: publish a new snapshot whenever an existing account's
effective feature map changes.
