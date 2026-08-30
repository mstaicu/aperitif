# Plans

Plans owns the reusable pricing matrix for account-level product access:

```text
features -> plans -> account plan -> feature snapshot
```

A feature has a stable ID. A plan assigns each included feature a boolean,
number, or string value. An account has one current plan. Products consume the
resolved feature values and never branch on a plan name.

When Plans first projects an Account, it assigns the seeded `free` plan and
publishes the complete Account feature representation at revision `1`.

Plans does not own accounts, payments, compliance decisions, or product data.

## Runtime

```text
ACCOUNTS stream -> accounts projection -> PostgreSQL
                                       -> API
                                       -> outbox -> Outbox Relay -> PLANS stream
```

| Part | Purpose |
| --- | --- |
| `accounts-projection` | Assign the initial plan when it sees an Account state |
| `api` | Assign plans and resolve features |
| `outbox-relay` | Publish account feature snapshots |
| `migrations` | Flyway SQL |
| `contracts` | Published Plans event package |
| `deploy` | Kubernetes workloads, including the database and migration Job |

Plans and their feature values are product configuration added through
migrations. The operator API exposes one command:

```text
PUT /v1/accounts/:account_id/plan
```

```json
{
  "plan_id": "pro"
}
```

The Accounts projector consumes
`accounts.account.v1.<account-id>` messages of type
`accounts.account.changed.v1`. It receives the current Account state when it
starts, then follows changes through an unnamed JetStream consumer. It runs as
one replica; each start reconciles the Account baseline. Plans publishes
`plans.account-features.changed.v1` to
`plans.account-features.v1.<account-id>` when it first assigns `free` and when
an Account's effective features change. `PLANS` retains one current feature map
per Account; it is not a historical event stream.

## Work here

```sh
make -C domains/plans check
make -C domains/plans migrate
make -C domains/plans deploy
make -C domains/plans dev
```

Add schema and configuration changes as
`workloads/migrations/sql/V###__description.sql`.

If a migration changes an account's effective features, it must also increment
that account's plan version, replace any still-pending snapshot for that
Account, and insert the complete current feature snapshot. The matrix update,
version, and outbox row belong in one transaction.

| Change | Publish snapshots? |
| --- | --- |
| Add or rename a plan | No |
| Add or rename a feature definition | No |
| Change a plan with no assigned accounts | No |
| Add, change, or remove a feature from a plan with assigned accounts | Yes |
| Assign an account to a plan through the API | Handled by the API |

The rule is simple: publish a new snapshot whenever an existing account's
effective feature map changes.
