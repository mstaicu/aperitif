# Domains

## Ownership

| Domain | Owns | Exports today |
| --- | --- | --- |
| Auth | Users, passkeys, sessions, operators, JWKS | Access JWTs and JWKS |
| Accounts | Account boundaries and generic human membership | Current Account state |
| Plans | Account plan selection and resolved features | Current Account feature state |

Auth proves identity. A domain decides authority from its own resource facts and
local projections. Accounts decides who belongs to an Account. Product domains
decide product permissions.

## Auth

Auth implements passkey registration and login, independent 30-day sessions,
five-minute access tokens, JWKS, and a passkey UI. It has no domain event feed.

```text
POST   /v1/passkeys/registration/options
POST   /v1/passkeys/registration
POST   /v1/passkeys/authentication/options
POST   /v1/passkeys/authentication
POST   /v1/session/access-tokens
DELETE /v1/session
GET    /.well-known/jwks.json
GET    /v1/auth/docs
```

The first operator is inserted through controlled database administration. There
is no operator-management API until a real requirement exists. See
[Operators](extensions/auth/operators.md).

## Accounts

Accounts implements `individual` and `organization` ownership boundaries. New
Accounts receive an initial `owner` membership in the same transaction. Generic
roles are only `owner` and `member`; product roles are Product state.

```text
GET  /v1/accounts
POST /v1/accounts
GET  /v1/accounts/docs
```

It exports one complete Account per subject:

```text
subject: accounts.account.v1.<account-id>
type:    accounts.account.snapshot.v1
stream:  ACCOUNTS
```

The representation includes current generic members and a monotonic Account
revision. Creation is revision `1`. Future membership or Account changes must
write the complete newer representation and replace any unpublished older
snapshot for that Account in the same transaction.

The public package is `@mstaicu/accounts-contracts`. It exports V1 schemas,
validation, subject and event builders, an example, and a compatibility test.

## Plans

Plans implements optional account-level plans and the resolved feature map. A
feature value is boolean, number, or string. Products use resolved feature
values, not plan names.

Plans observes Accounts. Seeing an Account for the first time assigns `free` and
publishes a complete feature map:

```text
consumes: accounts.account.v1.<account-id>
publishes: plans.account-features.v1.<account-id>
type:      plans.account-features.snapshot.v1
stream:    PLANS
```

The operator API assigns a plan:

```text
PUT /v1/accounts/:account_id/plan
{ "plan_id": "pro" }
```

Any change to an Account's effective features increments that Account's feature
revision and publishes its complete map. The public package is
`@mstaicu/plans-contracts`.

This is a first-seen initializer, not a replicated Account-state projection:
Plans retains only its local Account plan. It is idempotent and does not store
the Account revision.

## Add the smallest product domain

Start with an API, PostgreSQL, migrations, and a domain Makefile:

```text
domains/<domain>/
  workloads/
    postgres/            # skaffold.yaml and infra/
    migrations/          # Dockerfile, SQL, skaffold.yaml, and infra/
    api/                 # source, Dockerfile, skaffold.yaml, and infra/
  Makefile               # check, migrate, deploy, dev
  skaffold.yaml          # composes the domain workloads
```

Every workload owns `skaffold.yaml` and `infra/`. It owns source only when the
source belongs to the domain. The domain owns its deployment configuration even
when it uses an upstream image or shared runtime.

Add a current-state projection only when local authorization or business logic
needs another domain's current state:

1. Depend on the source contracts package and validate every message.
2. Store only the source fields needed locally, plus the source revision.
3. Use one unnamed `DeliverLastPerSubject` consumer, filtered to the feed
   subject family, and run one replica.
4. In one transaction, ignore equal or older revisions; otherwise replace local
   state and its revision.
5. Acknowledge after commit.

If a feed only initializes a local resource on first observation, make that
creation idempotent. Do not call it a current-state projection or add an unused
source-revision column.

Add a resource feed only when another domain needs your current state:

1. Define a small contracts package: complete data schema, CloudEvent schema and
   validator, subject builder, event builder, example, and compatibility test.
2. Add `outbox_events` and its `(queued_at, id)` index in the migration.
3. Commit each exported mutation and complete CloudEvent together.
4. Give each resource a monotonic revision; replace still-pending state for the
   same subject in that transaction.
5. Add a domain-owned `workloads/outbox-relay/` deployment, `streams.json`, and
   NATS access.

For a V2 shape, create a complete V2 feed. Continue V1 only while a consumer is
migrating. A V2 representation carries everything its own consumers need; it
does not need to preserve V1's internal shape.

Build a contracts package from its directory:

```sh
npm ci
npm test
npm run build
npm publish
```

When a domain adds a NATS client, add its production Flux graph and image policy
under `clusters/prod-eu`.
