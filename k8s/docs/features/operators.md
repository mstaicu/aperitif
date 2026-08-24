# Operators

Status: Implemented

## Purpose

An operator is a named human principal trusted for platform-wide administrative
actions. It is not an account role, a product role, or product authority.

## First version

Auth owns the operator set:

```sql
CREATE TABLE operators (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
);
```

Bootstrap the first operator through the controlled procedure in the
[Auth README](../../domains/auth/README.md#first-operator). When that user
exchanges a session for a short-lived access token, Auth adds operator: true.

An operator-only endpoint requires that claim plus its own action-specific
checks. There is no operator-management HTTP API.

## Later

If controlled database access ceases to be adequate, add operator listing,
granting, revocation, expiry, and durable audit. Add finer permissions only if
different operator groups need different platform authority.

## Not included

- Account ownership or membership management.
- Product roles or product authorization.
- Operator authority for PATs, machines, or delegated clients.
