# Plans

Plans owns optional account-level commercial configuration:

```text
feature definitions -> plans -> selected Account plan -> resolved feature map
```

A feature has a stable ID and a boolean, number, or string value. An Account has
one current plan. Products consume resolved feature values; they do not branch on
plan names.

Plans does not own Accounts, payments, compliance decisions, or product data.

## Implemented workloads

```text
ACCOUNTS -> accounts projection -> PostgreSQL -> API
                                      -> outbox -> Outbox Relay -> PLANS
```

| Workload | Responsibility |
| --- | --- |
| `postgres` | Plans' current local PostgreSQL instance |
| `migrations` | Flyway schema and seeded plan configuration |
| `accounts-projection` | Project Accounts and assign the initial `free` plan |
| `api` | Assign an Account plan and resolve features |
| `outbox-relay` | Publish resolved Account feature representations |
| `contracts` | Published Plans resource-feed package |

The operator API assigns an Account's selected plan:

```text
PUT /v1/accounts/:account_id/plan
{ "plan_id": "pro" }
```

## State flow

When the Accounts projection first sees an Account, Plans assigns `free` and
publishes revision `1` of that Account's complete feature map.

```text
consumes: accounts.account.v1.<account-id>
type:     accounts.account.changed.v1

publishes: plans.account-features.v1.<account-id>
type:      plans.account-features.changed.v1
stream:    PLANS
```

The Accounts projector is one replica with an unnamed baseline consumer. It
reconciles retained Account state at startup, then applies newer revisions.
`PLANS` retains one current feature map per Account; it is not a history stream.

Publish a new snapshot whenever an assigned Account's effective feature map
changes. That includes API plan assignment and a migration that changes features
for a plan with assigned Accounts. The feature change, Account feature revision,
pending-snapshot replacement, and outbox row belong in one transaction.

## Work here

```sh
make -C domains/plans check
make -C domains/plans migrate
make -C domains/plans deploy
make -C domains/plans dev
```

Add schema and seeded configuration changes as
`workloads/migrations/sql/V###__description.sql`.
