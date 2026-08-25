# Documentation

## Model

```text
identity    a record Auth recognizes: a user today, a machine later
principal   the identity acting in a request
credential  proof that the principal controls that identity
account     the ownership and authorization boundary
authority   what current domain facts permit the principal to do
```

```text
credential -> Auth -> short-lived access token -> domain API
```

Auth proves identity. Domain APIs decide authority from current membership,
resource facts, and business rules.

## Reading order

- [capabilities](capabilities/) — reusable platform building blocks. They may
  change one or more domains but never own product resources or workflows.
- [recipes](recipes/) — product blueprints. They define product domains and
  assemble the platform domains and capabilities they require.

1. A domain README is the current implemented boundary.
2. A capability is an implementation specification for one reusable outcome.
3. A recipe assembles domains and capabilities into one product.

`Implemented` means code is the source of truth. `Proposed` means the document
is ready to implement but has no runtime surface yet. `Illustrative` recipes
are product examples, not deployed interfaces.

Capabilities compose one way: a capability lists its prerequisites and extends
them without copying their tables, API, or events. Once a Product exists, its
README, OpenAPI, and contracts replace the recipe's proposed interface.

Each capability's `Evolution` section strengthens the same boundary in stages.
Start with the baseline and stop until a concrete threat, customer, or
regulatory requirement justifies the next stage.

## Rules

- Update a capability with the same change as its outcome, prerequisites,
  public API, or events.
- Update a recipe with the same change as its assembled blocks or workflow.
- New events follow the [platform event contract](../README.md#event-processing).
- Operational instructions stay beside the code they operate.

## Index

### Platform domains

- [Auth](../domains/auth/README.md) — foundational identity and credentials.
- [Accounts](../domains/accounts/README.md) — foundational account boundary and
  initial ownership.
- [Plans](../domains/plans/README.md) — optional account-level commercial
  feature snapshots.

### Capabilities

#### Auth

- [Operators](capabilities/operators.md) — platform-wide human authority;
  implemented.
- [Personal access tokens](capabilities/personal-access-tokens.md) — unattended
  human automation; proposed.
- [Machines](capabilities/machines.md) — non-human principal and credential
  exchange; proposed.

#### Accounts

- [Account membership management](capabilities/account-membership-management.md)
  — owner-managed generic members; proposed.
- [Account invitations](capabilities/account-invitations.md)
  — generic account admission through a one-time secret; proposed.
- [Account machine membership](capabilities/account-machine-membership.md) —
  attach machines to Account boundaries; proposed.

#### Product composition

- [Product member roles](capabilities/product-member-roles.md) — product-owned
  roles for account members; proposed.
- [Product-role invitations](capabilities/product-role-invitations.md) —
  optional product-role activation after account admission; proposed.

### Recipes

- [Automated farm](recipes/automated-farm.md) — Farm product domain;
  illustrative.
