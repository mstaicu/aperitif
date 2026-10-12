# ADR 0001: Identity is the canonical development boundary

**Status:** Accepted

## Context

The repository contains the older `Auth` and `Accounts` domains as separate
implementations, and the newer `Identity` domain that combines their
product-agnostic responsibilities. There is no deployed environment or live
state to migrate. Continuing to describe both paths as equally current would
create new dependencies on a topology we do not intend to extend.

## Decision

`domains/identity` is the sole forward-looking identity and account boundary
for local development.

Identity owns:

- passkey authentication, sessions, access tokens, and JWKS;
- accounts and generic memberships;
- its public HTTP and current-state contracts; and
- the `IDENTITY` current-state feed.

New product domains integrate with Identity's APIs and
`@mstaicu/identity-contracts`. They use `identity.*` NATS subjects; they do not
add dependencies on `Auth`, `Accounts`, or `@mstaicu/accounts-contracts`.

`domains/auth` and `domains/accounts` are frozen, runnable reference
implementations. They remain available for comparison and regression coverage,
but receive no new capabilities and are not composed by new product work.

Identity's current public state-feed surface is:

```text
package: @mstaicu/identity-contracts
stream:  IDENTITY

NATS subject: identity.account.v1.<account-id>
type:         identity.account.snapshot.v1
CloudEvent subject: account/<account-id>

NATS subject: identity.membership.v1.<membership-id>
type:         identity.membership.snapshot.v1
CloudEvent subject: membership/<membership-id>
```

The NATS subject is transport metadata. The CloudEvent `subject` is part of the
event payload; consumers validate both against the contract.

## Consequences

- Local development starts Identity, with ingress and the event bus only when a
  scenario requires them.
- Generic membership belongs to Identity. Product domains still own product
  roles, permissions, commercial models, and their own data.
- Invitations, machine principals, machine membership, and personal access
  tokens are proposed Identity extensions, not current functionality.
- No migration, session preservation, signing-key continuity, rollback,
  dual-write, compatibility, Flux rollout, or production cutover work is part
  of this decision: no deployed state exists.
- A later decision is required before removing the legacy domains or introducing
  a real deployed environment.
