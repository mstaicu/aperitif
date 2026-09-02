# Platform guide

Code, contracts, and manifests are implemented facts. An extension is a proposed
capability. An example is an illustrative product composition.

Start here:

- [Domains](domains.md) — implemented boundaries and the smallest new-domain
  path.
- [Operations](operations.md) — local cluster, GitOps, recovery, and diagnosis.
- [Roadmap](roadmap.md) — unresolved product-agnostic work.

Proposed capabilities:

- [Account membership](extensions/accounts/membership.md)
- [Account invitations](extensions/accounts/invitations.md)
- [Account machine membership](extensions/accounts/machine-membership.md)
- [Operators](extensions/auth/operators.md)
- [Personal access tokens](extensions/auth/personal-access-tokens.md)
- [Machines](extensions/auth/machines.md)
- [Product member roles](extensions/product/member-roles.md)

Example composition:

- [Automated farm](examples/automated-farm.md)

Add infrastructure only for a concrete requirement. A domain does not need NATS,
an outbox, Relay, a projector, or a contracts package merely because it exists.
