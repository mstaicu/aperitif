# ADR 0001: Identity is the canonical development boundary

**Status:** Accepted

## Context

Identity combines the product-agnostic responsibilities previously implemented
by separate `Auth` and `Accounts` domains. There is no deployed environment or
live state to migrate. Maintaining both implementations would duplicate code,
contracts and deployment configuration for a topology we do not intend to extend.

## Decision

`domains/identity` is the sole identity and account implementation for local
development and the declared production deployment.

Identity owns:

- passkey authentication, sessions, access tokens, and JWKS;
- accounts and generic memberships;
- its public HTTP and current-state contracts; and
- the `IDENTITY` current-state feed.

New product domains integrate with Identity's APIs and
`@mstaicu/identity-contracts`. They use `identity.*` NATS subjects.

On 2026-10-29, the legacy Auth and Accounts implementations were retired,
superseding the initial decision to retain them as frozen references. Their
source, legacy contracts and deployment inventories are removed from the current
tree. Historical implementations and regression scenarios remain in Git history.

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
- Future maintenance and regression coverage target Identity rather than parallel
  implementations of the same capability.
- Introducing a real deployed environment remains a separate decision.
