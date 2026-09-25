# Domain model

The foundation supports products by composing independent business capabilities.
Auth, Accounts and Plans are reusable capabilities; a product domain owns the
actual user journey and product vocabulary.

```text
B2C product       Auth + individual Account + Product
B2B product       Auth + organization Account + Product
Paid product      Auth + Accounts + Plans + Billing + Product
Machine product   Auth machines + Account machine membership + Product
```

Only deploy capabilities a product uses.

## Rules

- A domain owns its data, migrations, logic, APIs, messages and deployment.
- A domain never reads another domain's database.
- Cross-domain IDs are opaque values without cross-database foreign keys.
- Auth proves identity. Each domain decides authority locally.
- Accounts owns generic membership. Product roles belong to the Product domain.
- Plans publishes resolved feature values. Products do not authorize from plan
  names.
- Prefer asynchronous state transfer when a domain needs remote state during
  routine decisions. Use synchronous calls only when the user operation requires
  an immediate authoritative answer.
- Shared infrastructure code contains no domain vocabulary.

## Implemented domains

### Auth

Auth implements passkey registration and authentication, independent sessions,
five-minute access tokens, JWKS and the passkey UI.

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

Credential types such as enterprise federation, machine credentials or personal
access tokens remain Auth concerns but should be added only for a real product.

### Accounts

Accounts implements `individual` and `organization` boundaries. Creating an
Account adds the caller as its initial owner in the same transaction.

```text
GET  /v1/accounts
POST /v1/accounts
GET  /v1/accounts/docs
```

Accounts publishes its current representation:

```text
subject: accounts.account.v1.<account-id>
type:    accounts.account.snapshot.v1
stream:  ACCOUNTS
package: @mstaicu/accounts-contracts
```

The V1 snapshot contains the Account and its current generic members. This is a
simple model for ordinary tenant sizes. If very large tenants make complete
membership snapshots expensive, introduce separate versioned Account and
membership feeds; do not mutate V1.

Invitations, member administration and machine membership belong here. Product
roles do not.

### Plans

Plans owns optional Account plans and resolves them into product feature values.
It observes the Accounts feed, assigns `free` on first observation, and publishes:

```text
subject: plans.account-features.v1.<account-id>
type:    plans.account-features.snapshot.v1
stream:  PLANS
package: @mstaicu/plans-contracts
```

Products consume boolean, number or string feature values, not plan names. A
future Billing domain may provide commercial state, while Plans remains the
authority that resolves effective features.

## Communication

### Synchronous

HTTP is appropriate for the operation being requested now: authentication,
commands initiated by a person, and reads whose authoritative answer cannot be
local. A caller must tolerate the callee being unavailable.

Accounts fetches Auth's JWKS to validate access tokens. That is a narrow
identity dependency. Business domains do not call one another for routine
authorization.

### Asynchronous

Use a current-resource feed when a consumer needs another domain's state locally.
A snapshot is one complete exported resource, not an entire database. An event
reports a fact; a command asks an owner to perform an action. Snapshot, delta and
command describe different delivery requirements and must remain explicit.

Contracts live under `domains/<domain>/contracts`. Keep the schema, validator
and builders for one message together and export the supported API through
`src/index.mjs`. Contract packages contain no database, NATS or tracing clients.

Consumers pin exact package versions and validate every message. Publishing is
manual for now:

```sh
cd domains/<domain>/contracts
npm ci
npm run check
npm publish
```

Changing JavaScript exports requires a package release. Changing the wire shape
requires a new message version. Keep V2 beside V1 and publish both while real V1
consumers migrate.

## Publishing a current-resource feed

1. Give the source resource a positive monotonic version.
2. Build and validate its complete exported representation.
3. In the source transaction, replace any unpublished older snapshot for the
   same subject and insert the new outbox row.
4. Store the complete CloudEvent as `payload` and transport metadata as
   string-valued `headers`.
5. Let the domain-owned Relay Deployment publish it.

Relay is generic. It must not import the producer's contract or interpret its
payload.

## Consuming a current-resource feed

1. Depend on the producer's exact contract package version.
2. Validate the CloudEvent and its actual NATS subject.
3. Store only the remote fields needed locally, including source version.
4. Compare and write projection state in one transaction.
5. Acknowledge only after commit.

Use `DeliverLastPerSubject` for a fresh current-state projection. A consumer that
only initializes local state may remain idempotent without storing a full remote
projection.

## Adding a product domain

Start with the smallest deployable unit:

```text
domains/<domain>/
  workloads/
    postgres/            local/disposable database manifests
    migrations/          SQL, image, Skaffold and manifests
    api/                 source, image, Skaffold and manifests
  Makefile               check, up, dev, down
  skaffold.yaml          component composition
```

Every workload owns its `infra/base`, environment overlays and `skaffold.yaml`.
The base contains the portable workload and Service. Overlays contain routing,
access, credentials and environment configuration. The domain Skaffold file only
requires its component configs.

Add a UI, worker, contracts package, outbox relay or projection only when the
domain requires it. Product-owned records should carry `account_id` when they
belong to a tenant, and isolation tests must prove that one Account cannot read
or mutate another Account's data.
