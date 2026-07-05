# Documents Domain

Documents is the product proof domain.

## Owns

- `documents`
- `projected_account_members`
- `projected_account_entitlements`

Documents does not own identity, account authority, or entitlement authority.

## Units

```text
postgres -> migrate -> api/worker/ui
```

The worker consumes account and entitlement events. It publishes no events today.

## Public API

```text
POST /v1/accounts/:account_id/documents
GET  /v1/accounts/:account_id/documents
GET  /v1/documents/docs
```

The API checks identity JWTs, projected account membership, and projected
`documents.enabled` entitlement.

## Event Inputs

```text
accounts.account.opened
entitlements.account_entitlements.updated
```

Use the producer domains' `packages/contracts` as the source of event shape.

## Operations

```sh
make deploy-documents
make -C domains/documents check
```

## Rules

- Do not call core domains synchronously for hot-path authorization.
- Do not read other domains' databases.
