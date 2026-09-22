# Component readiness — 18 September 2026

**Verdict:** the current component boundaries work as a starter. Keep the layout,
Dockerfiles, domain Makefiles, and shared relay. No broad rewrite is justified by
this audit. Deployment resource budgets and repeatable environment verification
remain before calling the blueprint production-qualified.

This audit inspected the current source, packages, Dockerfiles, Skaffold modules,
all domain overlays, HTTP/event interfaces, and relevant platform dependencies.
It did not use earlier audit findings or roadmap items as proof of defects.
GitHub publication and Flux reconciliation were outside this pass.

## What constitutes a component here

A component owns its build or upstream image reference, executable behavior,
configuration, interfaces, and lifecycle. It may depend on a database, broker,
issuer, or another component through a declared interface. Independence does not
mean every component gets a separate database or becomes a complete SCS.
[SCS defines autonomy at the business-system boundary](https://scs-architecture.org/).

The existing `domains/<domain>/workloads/<component>` layout fits this model.
An image build uses that directory as its Docker context; domain Makefiles compose
local operations; Skaffold selects modules and imports the shared relay build.
Keep running Skaffold from the domain/component directory, as the Makefiles do:
[top-level paths resolve against the working directory](https://skaffold.dev/docs/design/config/#file-resolution).

## Inventory and interfaces

| Unit | Build and interface | Required dependencies | Assessment |
| --- | --- | --- | --- |
| Auth API | Own image; `/v1/passkeys/*`, `/v1/session*`, JWKS and versioned OpenAPI | Auth schema, signing-key files, `ORIGIN` | Production image and browser flow passed |
| Auth UI | Own image; login/signup pages, asset routes, HTTP calls to configured API | `API_INTERNAL_V1_URL`; browser origin matching Auth | Production pages, JS/CSS and both browser tests passed |
| Accounts API | Own image; account HTTP API, transactional account snapshot outbox | Accounts schema and configured JWKS endpoint | Works while relay/projector are stopped |
| Plans API | Own image; operator-authorized plan API and snapshot outbox | Plans schema, configured JWKS endpoint, initialized account plans | Production HTTP flow passed |
| Accounts / Plans relay deployments | One shared image; domain stream JSON and standard SQL outbox | Domain schema and JetStream | Both configurations passed; publishing works without the source API running |
| Plans accounts projection | Own image; Accounts snapshot input, local plan initialization and Plans outbox output | Plans schema and existing `ACCOUNTS` stream | Late startup and restart preserve initialization |
| Three migration components | Own SQL-only images; Flyway environment and process exit status | Corresponding PostgreSQL database | First application and rerun passed for all three |
| Three PostgreSQL components | Upstream image, domain configuration and Service | Cluster/container storage as configured | Exact `18.6` image exercised with all migrations |
| Auth retention | Upstream PostgreSQL image; CronJob owns its SQL and schedule | Auth schema | Configured cleanup command passed |
| Accounts / Plans contracts | Independent npm packages with validators and versioned subjects | Published package versions resolved by lockfiles | Both local packages and current consumers agree on versions; contract tests pass |

Deployment-only components do not need placeholder Dockerfiles. The relay does
not need to be copied into each domain. Component Makefiles would currently add
wrappers: the existing domain `check`, `migrate`, `deploy`, and `dev` targets are
appropriate entry points. A generic component-level check command could be added
later if that becomes an actual requirement.

## Changes and qualifications

**1. Declare production resource budgets.** All 14 domain workload definitions
render without container CPU/memory requests or limits; no repository-wide
LimitRange supplies defaults. Add measured CPU/memory requests and appropriate
memory limits in each component's production Deployment/Job/CronJob patch. This
uses native Kubernetes fields, with no application helper or orchestration code.
[Scheduling uses requests](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/).
The existing `platform/cluster/observability/base/agent-config.yaml` enables
`k8s.pod.memory_limit_utilization`, which requires container memory limits.
Acceptance: rendered workloads declare budgets; representative operation fits
those budgets; the existing monitoring pipeline reports utilization.

**2. Make environment verification repeatable before wiring E2E into CI.**
Auth's current `make e2e` assumes Skaffold, the local key/decryption setup, ingress
CRDs/controller, and the `tma.com` origin already exist. It is a valid prepared-
environment command, not a fresh-cluster bootstrap. Let the environment provision
cluster capabilities and each domain provision its test dependencies. Keep these
responsibilities out of API/UI runtime code. Acceptance: a fresh test environment
can run the documented command against images built from its checkout.

**3. Preserve the actual worker contract when expanding the blueprint.** The
current projector initializes a plan from snapshots; it is not a general mutable
projection or command processor. Each instance creates its own unnamed consumer,
so extra replicas receive duplicate work rather than sharing one queue. That is
consistent with its current single-replica, idempotent initialization behavior.
Change consumer configuration only when load sharing or another processing
contract is required; NATS provides [native consumer mechanisms](https://docs.nats.io/learn/jetstream/pull-consumers).

Declared dependencies still matter: Accounts/Plans need JWKS on a cold cache;
Plans projection needs an existing Accounts stream; stream configs request three
JetStream replicas. These are composition inputs, not reasons to deploy every
domain together. Telemetry is optional in the applications and uses the existing
Collector/log agent when configured; no per-component observability stack is needed.

Ephemeral namespace ownership is intentional, per the user's clarification.
NATS authentication and production PostgreSQL persistence remain excluded.

## Evidence and limits

- All four existing `make check` targets passed: 17 tests, lint/type checks and
  their manifest checks. Both Auth browser tests also passed.
- All nine production images built for `linux/amd64` from their own directories.
- All 18 Skaffold configurations parsed from their intended working directories;
  all three domain configurations rendered offline.
- All 28 component overlays rendered; selectors, referenced configuration and
  volume wiring checks passed. Rendered Secrets were sanitized before inspection.
- Isolated Docker tests exercised APIs/OpenAPI, UI assets and passkeys, three-node
  JetStream, actual domain stream JSON, both relays, the projector, migrations and
  retention. Offline-worker publication and late projection passed.
- All seven application processes handled SIGTERM with exit code 0 within one
  second in the healthy/idle shutdown test.
- Temporary audit containers and networks were removed. Evidence is in
  `/tmp/component-audit-20260918` and `/tmp/component-audit-*-check.log`.

This does not prove live Kubernetes admission, CNI enforcement, ingress/TLS,
Skaffold file sync, OpenObserve trace delivery, resource sizing under load, or
failure recovery for every outage. Those require an environment test; manifest
rendering and Docker tests cannot substitute for it. No runtime, deployment, or
workflow source was changed during this audit.
