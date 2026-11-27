# Aperitif

Independent systems for building products on Kubernetes. Start with the owner of the behavior you want to change.

| Owner | Scope |
| --- | --- |
| [Systems](systems/documents/README.md) | Boundaries, account isolation, and adding a domain |
| [Identity](systems/identity/documents/README.md) | Passkeys, sessions, accounts, and membership |
| [Platform](systems/platform/documents/README.md) | Event delivery, ingress, and telemetry |
| [Clusters](clusters/documents/README.md) · [prod-eu](clusters/prod-eu/documents/README.md) | Installing workloads and bootstrapping a cluster |

## Changing a rule

A PR and a test are enough for a small, unambiguous change. If it changes a documented rule, update that rule in the same PR. Write a new document when someone will need the decision, example, or procedure again.

When the intended behavior is unclear, put the question and one concrete example under **Proposed** in the owner's `documents/README.md`. Once agreed and shipped, move the rule and example into **Rules** and **Examples**, and link the relevant contract or test under **References**.

## Feature and initiative documents

Product requirements documents (PRDs) and technical design documents (TDDs) are optional. When a feature needs a page, use the owner's `documents/<feature>.md`. State who needs what outcome and give an acceptance example. Add a **Design** section for technical choices. If the design needs its own review, keep the requirements in `documents/<feature>/README.md` and the design in `documents/<feature>/design.md`.

For an initiative spanning systems, put the shared outcome in `systems/documents/` and link to each owner's feature. Use `clusters/documents/` for shared installation requirements. Name procedures for the task, such as `run-locally.md`. Keep worked scenarios in `documents/examples/` for as long as they clarify a rule or an open decision, including before implementation.
