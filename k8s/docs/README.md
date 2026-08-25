# Documentation

## Platform model

```text
identity    durable Auth record
principal   identity to which a request is attributed
credential  long-lived proof of an identity
account     ownership and authorization boundary
authority   what current domain facts allow the principal to do
```

```text
credential -> Auth -> short-lived access token -> domain API
```

Auth proves identity. Domain APIs decide authority from current membership,
resource facts, and business rules.

## Documents

- [capabilities](capabilities/) — reusable platform building blocks. They may
  change one or more domains but never own product resources or workflows.
- [recipes](recipes/) — product blueprints. They define product domains and
  assemble the platform domains and capabilities they require.

Read a domain README to learn the implemented boundary. Read a capability to
learn the reusable outcome it provides and its hard prerequisites. Read a recipe
to see which domains and capabilities a product assembles.

Capabilities compose in one direction: each provides one reusable outcome and
lists its hard prerequisites. A capability extends a prerequisite; it does not
copy or redefine the prerequisite's tables, API, or events.

An illustrative recipe may show intended routes and events. Once its product
exists, its domain README, OpenAPI document, and contract package are the
current interface. The recipe keeps the outcome, assembled blocks, workflow,
and non-goals.

## Keeping documents current

Update a capability in the same change when its outcome, prerequisites, public
API, or events change. Update a recipe in the same change when its assembled
blocks, workflow, or non-goals change.

## Index

### Platform domains

- [Auth](../domains/auth/README.md) — foundational identity and credentials.
- [Accounts](../domains/accounts/README.md) — foundational account boundary and
  initial ownership.
- [Plans](../domains/plans/README.md) — optional account-level commercial
  feature snapshots.

### Capabilities

- [Account membership invitations](capabilities/account-membership-invitations.md)
  — generic account admission through a one-time secret; proposed.
- [Account membership management](capabilities/account-membership-management.md)
  — owner-managed generic members after admission; proposed.
- [Product member roles](capabilities/product-member-roles.md) — product-owned
  roles for account members; proposed.
- [Product-role invitations](capabilities/product-role-invitations.md) —
  optional product-role activation after account admission; proposed.
- [Personal access tokens](capabilities/personal-access-tokens.md) — unattended
  human automation; proposed.
- [Machine identities](capabilities/machine-identities.md) — autonomous machine
  access; proposed.
- [Operators](capabilities/operators.md) — platform-wide human authority;
  implemented.

### Recipes

- [Automated farm](recipes/automated-farm.md) — Farm product domain;
  illustrative.

Operational instructions stay beside the code they operate.
