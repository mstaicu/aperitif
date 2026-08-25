# Operators

Status: Implemented

## Outcome

An operator is a named human principal trusted for platform-wide administrative
actions. It is not an account role, a product role, or product authority.

Owner: Auth.

## Requires

- [Auth](../../domains/auth/README.md) for users, sessions, and access tokens.

## State

Auth owns the operator set:

```sql
CREATE TABLE operators (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
);
```

Bootstrap the first operator through the controlled procedure in the
[Auth README](../../domains/auth/README.md#first-operator). When that user
exchanges a session for a short-lived access token, Auth adds `operator: true`.

An operator-only endpoint requires that claim plus its own action-specific
checks. There is no operator-management HTTP API.

## Evolution

| Stage | Strengthen | Add when |
| --- | --- | --- |
| Baseline | Bootstrap one named operator through the controlled database procedure. | A small trusted team operates the platform. |
| Controlled | Manage named grants and revocations through a fresh-authenticated administrative operation with notifications and durable audit. | Manual database changes no longer provide enough control or evidence. |
| High assurance | Use just-in-time operator grants, two-person approval for sensitive actions, isolated break-glass access, and periodic access review. | Platform administration is a material security or regulatory boundary. |

## Not included

- Account ownership or membership management.
- Product roles or product authorization.
- Operator authority for PATs, machines, or delegated clients.
