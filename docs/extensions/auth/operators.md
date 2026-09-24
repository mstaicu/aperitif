# Operators

Status: Implemented. Owner: Auth.

An operator is a named human principal for platform-wide administration. It is
not an Account role, product role, or product authority.

Auth owns `operators(user_id)`. Bootstrap the first operator through controlled
database administration; the next access token includes `operator: true`. There
is no operator-management API. An operator-only endpoint still performs its own
action-specific checks.

Add managed grants, fresh authentication, notifications, durable audit,
two-person approval, or break-glass access only when platform administration
needs those controls.
