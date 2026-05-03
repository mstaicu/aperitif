# AGENTS.md

Add only domain-specific agent traps here. Do not copy this file by default if the domain has no non-obvious rules.

Good entries:

- ownership boundaries that agents commonly violate,
- event/outbox invariants,
- external dependencies that must not be faked,
- deployment-order traps.

Bad entries:

- folder maps that are already visible,
- generic advice copied from the root README,
- generated summaries.

After copying this template, replace the README with the actual domain boundary,
deployment units, contracts, and dependencies. Add AGENTS entries only for traps
that are not obvious from the README, code, tests, or manifests.
