# Aperitif

A Kubernetes foundation for SaaS products built from independently deployable
domains. Identity provides passkeys, sessions, accounts, generic membership, and
current-state and lifecycle feeds. Analytics projects public outputs into owned
PostgreSQL reporting views. Product domains own their vocabulary, workflows,
data, and commercial model.

Code, contracts, and manifests are implemented facts. An extension is a proposed
capability. An example is an illustrative product composition.

Repository layout:

```text
systems/<system>/        independently owned source packages, contracts and reusable infra
systems/platform/        shared capabilities and executable code without domain rules
clusters/prod-eu/        Flux inventory, concrete deployment overlays and encrypted configuration
docs/                    domain model, operations, extension recipes and roadmap
```

Start here:

- [Domains](domains.md) — implemented boundaries and the smallest new-domain
  path.
- [Operations](operations.md) — local cluster, GitOps, recovery, and diagnosis.
- [Deployed Analytics validation](analytics-validation.md) — exercised endpoints,
  source-to-sink preservation, replay and analytical usefulness.
- [Analytics foundation](analytics.md) — implemented contracts, ingestion,
  reader interface and tested recovery boundaries.
- [Analytics domain](../systems/analytics/README.md) — local commands and SQL readers.
- [ADR 0001](adr/0001-identity-is-the-canonical-development-boundary.md) —
  Identity is the canonical local-development boundary.
- [Roadmap](roadmap.md) — unresolved product-agnostic work.

Proposed capabilities:

- [Analytics crash course](extensions/analytics-primer.md) — measurement, data
  architecture and local/SaaS component choices from first principles.
- [Analytics as a domain](extensions/analytics.md) — ownership, minimal topology,
  staged evolution and event/metric planning.
- [Analytics capability assembly](extensions/analytics-platform.md) — domain
  boundaries, independently useful components and their prerequisites.
- [Local Analytics deployment](extensions/analytics-local.md) — local placement,
  PostHog edition limits and durable state/delta/command consumers.
- [Analytics and agent feedback loop](extensions/analytics-agent-loop.md) —
  industry research and an optional composed workflow using CI/Flux.
- [Identity membership management](extensions/identity/membership.md)
- [Identity invitations](extensions/identity/invitations.md)
- [Identity machine membership](extensions/identity/machine-membership.md)
- [Personal access tokens](extensions/identity/personal-access-tokens.md)
- [Machines](extensions/identity/machines.md)
- [Product member roles](extensions/product/member-roles.md)

Examples:

- [Messaging](examples/messaging.md) — stream, producer and consumer patterns for
  state snapshots, deltas and commands.
- [Automated farm](examples/automated-farm.md)
- [Identity account snapshot](../systems/identity/contracts/examples/messages/identity.account.snapshot.v1.json)
- [Identity membership snapshot](../systems/identity/contracts/examples/messages/identity.membership.snapshot.v1.json)

Add infrastructure only for a concrete requirement. A domain does not need NATS,
an outbox, Relay, a projector, or a contracts package merely because it exists.
