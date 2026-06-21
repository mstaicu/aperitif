# Documents Domain

Documents is the product-domain proof of the platform spine.

## Status

Product proof domain. Consumes core projections; publishes no events today.

## Owns

- `documents`
- `projected_account_members`
- `projected_account_entitlements`

The projection tables are local permission and entitlement inputs copied from
accounts and entitlements events.

## Does Not Own

- identity records
- account authority
- entitlement authority
- payments, notifications, workflow

The API verifies identity-issued JWTs, then authorizes from local projections.

## Units

```text
postgres -> migrate -> api/worker/ui
```

- `postgres`: local/CI placeholder database.
- `migrate`: Flyway Job from `packages/migrate`.
- `api`: Fastify API from `packages/api`.
- `worker`: projection consumers from `packages/worker`.
- `ui`: server-rendered proof UI from `packages/ui`.

The worker consumes existing streams and does not publish events yet.

## Public Contracts

```text
POST /v1/accounts/:account_id/documents
GET /v1/accounts/:account_id/documents
GET /documents
```

The command requires:

- valid identity token
- active projected account member with required permission
- `documents.enabled = true` in projected account entitlements

API docs:

```text
GET /v1/documents/docs
GET /v1/documents/docs/json
```

## Event Contracts

Consumes:

| Subject | Producer | Projection |
| --- | --- | --- |
| `accounts.account_member.updated` | `accounts` | `projected_account_members` |
| `entitlements.account_entitlements.updated` | `entitlements` | `projected_account_entitlements` |

Publishes: none.

## Operations

```sh
make deploy-documents
```

Live Flux units:

```text
documents-postgres -> documents-migrate -> documents-api/documents-worker/documents-ui
```

The worker depends on accounts and entitlements workers because those streams
must exist before documents consumes them.

## Agent Notes

- Do not call identity, accounts, or entitlements synchronously for hot-path auth.
- Do not read other domains' databases.
- The placeholder Postgres unit uses the default `postgres` admin user. API,
  worker, and migrate units use the same admin connection URL for now.
