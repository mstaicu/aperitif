# Aperitif

A Kubernetes foundation for SaaS products built from independently deployable
domains. Identity provides passkeys, sessions, accounts, generic membership, and
current-state feeds. Product domains own their vocabulary, workflows, data, and
commercial model.

Code, contracts, and manifests are implemented facts. An extension is a proposed
capability. An example is an illustrative product composition.

Repository layout:

```text
domains/                 business boundaries and deployable workloads
platform/cluster/        ingress, NATS and observability
platform/runtime/        shared executable infrastructure without domain rules
clusters/prod-eu/        Flux production inventory and release state
docs/                    domain model, operations, extension recipes and roadmap
```

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
- [Identity account snapshot](../domains/identity/contracts/examples/events/identity.account.snapshot.v1.json)
- [Identity membership snapshot](../domains/identity/contracts/examples/events/identity.membership.snapshot.v1.json)

Add infrastructure only for a concrete requirement. A domain does not need NATS,
an outbox, Relay, a projector, or a contracts package merely because it exists.
