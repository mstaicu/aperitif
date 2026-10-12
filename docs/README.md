# Platform guide

Code, contracts, and manifests are implemented facts. An extension is a proposed
capability. An example is an illustrative product composition.

Start here:

- [Domains](domains.md) — implemented boundaries and the smallest new-domain
  path.
- [Operations](operations.md) — local cluster, GitOps, recovery, and diagnosis.
- [ADR 0001](adr/0001-identity-is-the-canonical-development-boundary.md) —
  Identity is the canonical local-development boundary.
- [Roadmap](roadmap.md) — unresolved product-agnostic work.

Proposed capabilities:

- [Identity membership management](extensions/identity/membership.md)
- [Identity invitations](extensions/identity/invitations.md)
- [Identity machine membership](extensions/identity/machine-membership.md)
- [Personal access tokens](extensions/identity/personal-access-tokens.md)
- [Machines](extensions/identity/machines.md)
- [Product member roles](extensions/product/member-roles.md)

Examples:

- [Automated farm](examples/automated-farm.md)
- [Current-state projection](examples/current-state-projection.md)

Add infrastructure only for a concrete requirement. A domain does not need NATS,
an outbox, Relay, a projector, or a contracts package merely because it exists.
