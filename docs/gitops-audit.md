# GitOps and deployment architecture audit

Reviewed 6 November 2026, against working-tree HEAD `62b6dc31`.
Three parallel reviews covered domains, platform runtimes/infrastructure, and
GitHub Actions/Flux, followed by a combined architecture review and research
against primary documentation.

**Recommendation: retain the domain/workload model, Flux, Skaffold, Kustomize,
and the monorepo. Strengthen release promotion, production infrastructure, and
the validation of the complete reconciliation graph.** Moving every manifest
into a central applications directory would add churn without fixing the main
failure modes.

Test coverage is deliberately excluded following the user's direction. Manifest,
workflow, build, and configuration validation remain in scope. No application,
deployment, or infrastructure configuration was changed by this audit.

This is a repository review, not a live production assessment. The declared
production configuration does not prove a production cluster exists; this is
explicit in [operations](operations.md). Branch rules, cloud firewalls, running
controller settings, registry access, provider backups, and actual deployment
health were not verified. Findings below distinguish declarations from inferred
failure modes.

## How the units currently fit together

| Unit | Ownership and purpose | Execution interface |
| --- | --- | --- |
| Domain | Business boundary, owned data, contracts, workloads and deployment; Identity and Analytics currently exist | Domain Makefile and composition-only Skaffold file |
| Workload | One deployable process or operational task: API, UI, migrations, relay, retention, database | Its source/image, Skaffold module, Kustomize base and environment overlays |
| Shared runtime | Reusable executable infrastructure with no domain vocabulary; currently outbox relay | Runtime-owned image build; consuming domain owns deployment and configuration |
| Cluster capability | Shared ingress, event bus, observability | Platform-owned bases and local/production overlays |
| Cluster inventory | Selection of capabilities/domains, Flux dependency graph, image policies and release digests | `clusters/prod-eu`, reconciled by Flux after bootstrap |
| Contracts package | Public domain messages, schemas, builders and transport addresses | Separately published npm package; consumers pin its version |

The separation between the relay executable and its domain deployment is
particularly good. [Identity's relay module](../domains/identity/workloads/outbox-relay/skaffold.yaml)
requires the [platform runtime build](../platform/runtime/outbox-relay/skaffold.yaml),
while Identity owns stream definitions, DB access, manifests and configuration.
Reuse does not surrender domain ownership.

The two deployment paths are:

```text
Local:
  domain Makefile
    -> Skaffold database module
    -> delete/recreate migration Job, wait for completion
    -> Skaffold runtime modules
       -> Kustomize local overlays
       -> development image builds and optional file sync

Declared production:
  source merge to master
    -> changed workload/runtime image matrix
    -> production image build + provenance + SBOM
    -> push commit-tagged image, scan its digest
    -> move latest to that scanned artifact
    -> Flux reflects each latest digest
    -> Flux commits setters to master
    -> per-workload Flux Kustomizations reconcile production overlays
```

Domain `check` targets operate on packages. Platform/cluster and cluster-inventory
`check` targets render Kustomize. CI adds schema validation for domain overlays
only. These are different assurance levels behind the same target name.

CI discovers check units at directory depth two and image units at workload/runtime
depth. It reads the first build artifact's image from each unit's Skaffold file,
then builds the unit directory with Docker target `prod`. This works for the
current one-image-per-build-unit convention. Deploy-only modules correctly have
no image to publish. Excluding `infra` changes from image builds is reasonable.

Analytics has a local composition and published-image build path, but no declared
production inventory. That is a capability selection, not inherently an omission:
the domain model explicitly says to deploy only capabilities a product uses.

## What should remain

- Domain-owned source, migrations, contracts and deployment manifests.
- Thin domain composition instead of a universal environment framework.
- Shared executable runtime code separated from consuming deployment/configuration.
- One trunk with environment/cluster directories.
- Kustomize for first-party workload configuration.
- Flux as the production reconciler, with explicit dependency and health checks.
- SOPS for committed production Secret material.
- Multi-stage Docker builds, lockfile installs, production-only dependencies,
  non-root application users, and Tini.
- Publication by immutable digest, SBOM/provenance generation, and scanning before
  making an image eligible for the current automatic delivery policy.

This already follows much of the declarative, versioned, pulled, continuously
reconciled model described by [OpenGitOps](https://opengitops.dev/). The main gap
is confidence in the selected release and in recovering the underlying state.

## Findings and recommendations

### 1. Production must not inherit the disposable database

**P0 before real production use.**

[The production database Flux object](../clusters/prod-eu/domains/identity/postgres.yaml)
at line 10 selects the production overlay, which inherits
[the PostgreSQL base Deployment](../domains/identity/workloads/postgres/infra/base/deployment.yaml).
The base has no persistent data volume. The production patch adds configuration
without changing that storage model. This is consistent with a disposable local
database, but unsuitable for retained Identity state.

Make disposable PostgreSQL local-only. Production should use a managed PostgreSQL
service, or a separately designed operator-managed database with persistent
storage, backups, WAL recovery and a rehearsed restore procedure. Set explicit
RPO/RTO. A PVC alone does not provide backup or disaster recovery.

Use different migration and runtime DB roles. Production API, relay, migration
and retention overlays currently embed password-bearing connection information
and use the database superuser; see
[API deployment:12](../domains/identity/workloads/api/infra/overlays/prod-eu/deployment.yaml)
and [migration Job:14](../domains/identity/workloads/migrations/infra/overlays/prod-eu/job.yaml).
Replace these with encrypted Secrets and `secretKeyRef`, provision credentials
outside Git in plaintext, and rotate any credentials ever used for real systems.
Credential values are intentionally omitted here.

When changing the DB endpoint, update NetworkPolicies and connectivity checks:
the current API egress policy allows an in-namespace PostgreSQL pod selector,
not an arbitrary managed service. Treat the binding, credentials and access path
as one change.

[Kubernetes' stateful application guidance](https://kubernetes.io/docs/tasks/run-application/run-single-instance-stateful-application/)
describes persistent storage and safe update behavior;
[CloudNativePG recovery guidance](https://github.com/cloudnative-pg/cloudnative-pg/blob/main/docs/src/recovery.md)
describes backup/WAL recovery if an operator is chosen.

### 2. Promote a domain release, with explicit migration compatibility

**P1 before automatic production delivery.**

[Publish:68](../.github/workflows/publish.yaml) uses independent image jobs; each
job moves its own `latest` after scanning. API and migration
[image policies](../clusters/prod-eu/domains/identity/api.yaml) independently
observe those changes. A fast API build can become eligible before its matching
migration image; a failed sibling scan can leave a partially advanced release.

The API's `dependsOn` at lines 49–50 requires a Ready migration Kustomization.
That status can belong to the previous release. It does not establish that the
migration intended for the newly selected API has completed.

Build and scan the affected images first, then assemble one promotion change per
domain containing their exact digests and a release identifier. Preserve unchanged
workload digests in the same release inventory. For coordinated changes, gate the
application on a matching migration release identifier, Ready status and observed
generation. Flux documents this lockstep use of
[`dependsOn.readyExpr`](https://fluxcd.io/flux/components/kustomize/kustomizations/#dependency-ready-expression).
When using a custom expression, include readiness/generation checks because it
replaces the default readiness check unless the relevant additive feature is enabled.

Keep expand/contract database and message changes. A grouped Git change does not
make Kubernetes rollouts atomic, and reverting an image does not reverse a schema
change. Release metadata should declare compatibility or a migration epoch when
needed, rather than imply every artifact must always rebuild together.

The migration Job's
[resource-specific force annotation:6](../domains/identity/workloads/migrations/infra/overlays/prod-eu/job.yaml)
already handles immutable Job image updates correctly. Preserve it.
[Flux explicitly supports this Job execution pattern](https://fluxcd.io/flux/use-cases/running-jobs/).
Avoid adding a TTL to a continuously reconciled fixed-name migration Job without
considering that Flux would recreate it after garbage collection.

### 3. Make production promotion pass through a validated Git change

**P1.**

[Image automation:14–25](../clusters/prod-eu/automation.yaml) writes directly to
`master`. [Checks:3–6](../.github/workflows/checks.yaml) runs only for PR and
merge-group events, so those direct digest commits receive no declared check run.
External branch rules may reject the push or allow a bypass; the checkout does
not establish which.

Prefer a dedicated promotion branch and PR, with protected-branch auto-merge when
fully automatic delivery is wanted. Validate the selected inventory before merge.
This can remain small: no release platform or new deployment orchestrator is needed.
Direct bot writes are a possible operating choice, but require deliberate rules
and validation before pushing.

Following a mutable tag while committing its resolved digest is supported
[Flux digest pinning](https://fluxcd.io/flux/guides/image-update/#digest-pinning).
The problem is independent release selection and bypassed validation, not the tag
name itself. Existing production image fields start with empty digests; require
nonempty immutable digests in a production-ready inventory and seed the initial
release before relying on it.

### 4. Validate the complete configuration graph

**P1. This concerns deployability, independently of application test coverage.**

[Checks:96–106](../.github/workflows/checks.yaml) schema-validates domain overlays.
[Platform checks](../platform/cluster/Makefile) and
[cluster checks](../clusters/prod-eu/Makefile) only render YAML.
Rendering the cluster inventory emits Flux resources; it does not follow their
`spec.path` and validate the workload trees they reference.

Also, the changed-path selector at checks lines 37–40 excludes
`.github/workflows`, so a workflow-only PR receives no substantive check/build
matrix.

Add one shared configuration-validation entry point, called locally and by CI:

1. Validate workflow syntax, for example with actionlint.
2. Render and schema-validate every supported domain and platform overlay,
   plus Flux resources, against pinned Kubernetes and CRD schema versions.
3. Resolve every local Flux `spec.path`; fail on missing paths and render each
   referenced Kustomize tree. Do not assume a top-level build traverses them.
4. Validate dependency references and cycles, image setter/policy names, initial
   production digests, and production storage/security requirements.
5. Offline-render the composed domain Skaffold graphs.
6. Validate NATS and Collector configuration using their native tooling or
   container startup validation where practical.

Add an always-running final CI status with a stable name that fails when required
configuration/build jobs fail. Handle intentionally empty matrices explicitly.
Workflow/tooling changes should exercise the appropriate validation rather than
look unchanged to the matrix.

Share the implementation through a small script or Make target. Local Flux lacks
the schema plugin installed by CI; the Brewfile also does not pin the toolchain.
Document or automate matching CLI/plugin versions. Flux's
[schema plugin](https://v2-9.docs.fluxcd.io/flux/cli-plugins/flux-schema/)
can remain the validator; replacing it is unnecessary.

Any rendered YAML exposed to people or stored as review artifacts must first
replace every Secret `data` value with `ZHVtbXk=` and every `stringData`
value with `dummy`, as required by AGENTS.md.

### 5. Production NATS needs broker-level isolation

**P1 before real production use.**

[Production NATS configuration:35–49](../platform/cluster/event-bus/overlays/prod-eu/nats.conf)
maps unauthenticated clients into APP without subject permissions and contains a
fixed SYS credential. Client and route transports have no declared TLS, and no
NATS NetworkPolicy exists.

A reachable compromised client can exceed its intended publishing/consuming role.
Domain ownership rules in application code do not enforce broker permissions.
Move authentication, least-privilege subject/JetStream permissions, protected SYS
access, route protection and an explicit transport-security decision into the
production baseline. NetworkPolicy supplements these permissions.

Start with per-workload identities and a modest permissions model. Separate NATS
accounts with explicit imports/exports are an option when stronger domain trust
boundaries warrant the additional configuration. Avoid granting every application
stream-administration privileges just because it connects to JetStream.

See [NATS authorization](https://docs.nats.io/learn/security/authorization) and
[TLS configuration](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/tls).
The roadmap currently defers these controls until workloads become mutually
untrusted; production Identity state warrants an earlier baseline.

### 6. Separate certificate issuance from the ingress process

**P1 for reliable production upgrades and availability.**

[Traefik base:10](../platform/cluster/ingress/base/deployment.yaml) has one replica
and default rolling deployment behavior.
[Production:73–80](../platform/cluster/ingress/overlays/prod-eu/deployment.yaml)
mounts writable ACME state from a
[ReadWriteOnce block volume](../platform/cluster/ingress/overlays/prod-eu/acme-persistentvolumeclaim.yaml).
A replacement scheduled on another node can wait on attachment while the old
pod remains alive; two pods on the same node may instead share writable ACME state.
These are inferred rollout risks, not observed incidents.

Use cert-manager or an equivalent external certificate lifecycle, store issued
certificates as TLS Secrets, and make Traefik stateless. Then run two replicas,
spread placement and an appropriate disruption budget if ingress availability is
required. A deliberate Recreate strategy is a smaller temporary option with downtime.

RWO means one node, not necessarily one pod:
[Kubernetes access modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes).
Traefik documents
[certificate-controller integration](https://doc.traefik.io/traefik/v3.2/user-guides/cert-manager/).

### 7. Declare the Cloudflare-to-origin trust boundary

**P1 before relying on edge security controls.**

The domain guide assigns rate limiting to Cloudflare, while the
[production Service:7–13](../platform/cluster/ingress/overlays/prod-eu/service.yaml)
declares a public load balancer without source restrictions. No corresponding
origin-authentication or cloud firewall declaration was found. External provider
controls could exist, so this is a repository gap, not proven live exposure.

Declare and validate the origin restriction/authentication mechanism, forwarded
header trust, DNS ownership and certificate assumptions together. Otherwise direct
origin traffic could bypass the edge controls on which the application depends.
Keep provider resources in the explicit infrastructure lifecycle described below.

### 8. Finish Flux bootstrap, self-management and failure visibility

**P1/P2 before a retained environment.**

[Cluster resources](../clusters/prod-eu/kustomization.yaml) include platform,
domains and automation, but not `flux-system`.
[Operations:115–117](operations.md) tells the operator to add the generated
directory manually after bootstrap. Make that a verified, complete bootstrap
sequence rather than an easy-to-miss follow-up. It should leave Flux managing its
own installation and upgrade configuration.
[Flux bootstrap customization](https://fluxcd.io/flux/installation/configuration/bootstrap-customization/)
supports declaring those resources and controller patches.

[Bootstrap:24–25](../clusters/prod-eu/Makefile) omits notification-controller.
There are no declared Flux Alert/Provider resources or controller-metric alerts.
An HTTP-healthy pod can coexist with a failed Git source, stale image policy or
stuck reconciliation.

Add failure notifications and monitor reconciliation readiness/age, controller
health and image-automation failures. Decide an alert destination as part of
implementation; none was contacted during this audit.
[Flux alerts](https://fluxcd.io/flux/monitoring/alerts/) are sufficient to start.

### 9. Make availability and resource budgets explicit

**P2, promoted to P1 where availability is required.**

Domain workload manifests lack CPU/memory budgets and Kubernetes security contexts;
for example [API base:15–21](../domains/identity/workloads/api/infra/base/deployment.yaml).
Application images run non-root, and workloads generally disable unnecessary
service-account tokens; preserve those strengths while adding pod-level policy.

Use measured CPU/memory requests, memory limits, dropped capabilities, no privilege
escalation, RuntimeDefault seccomp, and a read-only root filesystem where compatible.
Use multiple stateless replicas and topology spread when required. PDBs protect
against eligible voluntary evictions; they do not by themselves make every rollout
or failure safe. Apply restricted namespace policy after resolving image-specific
requirements, with a deliberate exception for the host-reading telemetry agent.
See [resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
and [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/).

NATS already has three servers, persistent per-server volumes, hostname
anti-affinity, hardened container settings, probes and graceful shutdown.
It still needs a maintenance PDB preserving quorum, compute budgets and measured
storage sizing. The two Identity R3 streams reserve 400 MiB each in
[streams.json](../domains/identity/workloads/outbox-relay/infra/base/streams.json),
against [1 GiB per-server PVCs:27](../platform/cluster/event-bus/overlays/prod-eu/statefulset.yaml).
Their configured maxima can approach 800 MiB per server before overhead or more
domains. Measure actual use and reserve headroom; do not infer sufficient capacity
merely from three replicas. Zone spreading depends on the real provider topology.

### 10. Treat recovery and provisioning as explicit lifecycles

**P1 before retained production data.**

Operations specifies a sound source-lock/outbox-based state reseed contract but
explicitly says no reseed command exists. Implement domain-owned operator-run
reseed/recovery units, with bounded batches and restartability. A recovery Job is
not a continuously reconciled deployment that should rerun whenever it disappears.

Define database restore, JetStream loss, consumer/projection rebuild, signing-key
recovery and full-cluster recovery procedures. Distinguish replayable current
state from historical occurrence events: a present-state reseed cannot reconstruct
an irretrievably lost event history. Decide the durability/backup obligation for
each feed. Record restore evidence and RPO/RTO before sustained use.

No cloud provisioning configuration was found. The overlays assume DigitalOcean
storage classes, public ingress, DNS and external credentials without declaring the
complete provider lifecycle. Add an explicit IaC boundary for cluster/node pools,
network/firewalls, managed DB, backup storage and DNS where this repository owns
them, or link to the authoritative external configuration.

Terraform/OpenTofu/Pulumi or a managed-platform configuration can fill this role.
Choose based on actual provider requirements. Flux should manage the resources it
can reach after bootstrap; document the initial trust/state/bootstrap dependency
rather than making the cluster the only mechanism able to recreate itself.

### 11. Give reusable runtimes an explicit consumer release version

**P2 now; more important with additional domains.**

[Identity's relay image policy:23–28](../clusters/prod-eu/domains/identity/outbox-relay.yaml)
tracks the shared executable's `latest`. Repeating this for more domains would
make a runtime merge advance all consumers independently.

Keep the executable in `platform/runtime`, but select its immutable digest in
each consuming domain release. Automation can propose upgrades to consumers.
This preserves shared maintenance and gives domains control over adoption and
rollout order. A runtime image update should not silently become a platform-wide
business release.

Keep contract publication explicit too. Current consumers pin the published
`0.8.0` package; editing the source package alone does not update installed
consumers. When that manual release step becomes burdensome, add a small
package-release workflow and consumer update PRs. Do not replace versioned public
contracts with incidental monorepo source imports merely to avoid publication.

### 12. Harden reproducibility and the supply chain incrementally

**P2; Action pinning is a small immediate improvement.**

All workflow actions use version tags, including publication actions with registry
write permissions. Pin verified full commit SHAs, automate update PRs, and disable
checkout credential persistence where pushing is unnecessary.
[GitHub's secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use)
explains immutable action references and least privilege.

Dockerfiles and third-party manifests pin version tags but not digests.
API/UI use Node 26.13.0, relay/projector use 26.10.0, and checks use 26.10.0.
Align intentional runtime/toolchain versions and record platform architecture.
Pin upstream image digests with reviewed updates. Migration Dockerfiles run a
floating `apk upgrade`; either obtain fixes through updated upstream images or
make that rebuild policy explicit. Pinning a base digest does not pin everything
downloaded by later RUN instructions.

Schedule dependency/base-image update checks and rescans of deployed digests:
current publication triggers only on source-path changes. Preserve production
SBOM/provenance generation. For stronger trust guarantees, verify expected
repository/workflow identity before promotion or admission; merely generating
BuildKit provenance does not enforce it.
[Docker build guidance](https://docs.docker.com/build/building/best-practices/)
and [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
provide the relevant mechanisms.

Build a trusted commit once, then promote the exact scanned digest through any
staging/production path. No need to rebuild for each environment. Add shared
BuildKit cache imports/exports scoped per image if build duration warrants it;
the current workflow declares none.
[Docker's GitHub cache guidance](https://docs.docker.com/build/ci/github-actions/cache/)
describes this optimization. Multi-architecture publication is needed only if
the selected cluster nodes require it.

### 13. Keep Make and Skaffold small, consistent and context-safe

**P1 for context guards; P3 for cleanup.**

[Identity Makefile:12–27,34–35](../domains/identity/Makefile) and
[Analytics Makefile:8–22](../domains/analytics/Makefile) use the ambient Kubernetes
context, including deleting migration Jobs and deleting the deployment graph.
Pass an explicit approved local context to both direct `kubectl` calls and
Skaffold. Fail early when a local command targets a retained environment.
[Skaffold defaults to the current context](https://skaffold.dev/docs/environment/kube-context/).
Apply explicit context selection to bootstrap as well.

Extract the duplicated DB/migration preparation in `up`/`dev` into a small
prerequisite target. Keep orchestration order visible. Add a root `help`,
`validate` and optional aggregation target for discovery; domain Makefiles
should remain usable directly.

API/UI Skaffold modules build their `dev` targets even for `make up`.
Consider defaulting ordinary deployment to `prod` and enabling watcher/sync
behavior through a `dev` profile, or add an explicit production-image deployment
target. [Skaffold profiles](https://skaffold.dev/docs/environment/profiles/)
support the distinction. This reduces differences between local ordinary
deployment and production process/dependency behavior.

Do not introduce a second hand-maintained image catalog just for CI. Either
document and validate the current one-image-per-unit convention, or, when richer
build requirements arrive, derive image/context/target metadata from the full
Skaffold configuration. CI currently reads only the image while assuming context
and target; those assumptions work today but should fail clearly if violated.

The current `requires` graph and manual file-sync hierarchy resolve correctly.
There is no demonstrated sync-path bug.
[Skaffold configuration dependencies](https://skaffold.dev/docs/design/config/)
already provide composition; a new monorepo build framework is not justified by
the present scale.

## Recommended repository shape

The smallest useful structural change is to separate disposable development
dependencies from retained production data, and to make release/provisioning
ownership visible:

```text
domains/
  identity/
    contracts/
    workloads/
      api/                    source + Dockerfile + Skaffold + infra/base
      ui/
      migrations/
      outbox-relay/           deployment/config; shared executable elsewhere
      retention/
    dev/
      postgres/              explicitly disposable
    data/
      postgres/              durable DB declaration/binding, if owned here
    Makefile
    skaffold.yaml
  analytics/
    ...same ownership rules...
platform/
  runtime/
    outbox-relay/             reusable executable/image
  cluster/
    ingress/
    event-bus/
    observability/
    certificates/            only if certificate controller is adopted
  provisioning/              provider IaC, or reference to its authoritative home
clusters/
  prod-eu/
    flux-system/             generated, committed, included, self-managed
    platform/
    domains/
      identity/              selected digests + release marker + dependency graph
    automation.yaml
    kustomization.yaml
tools/
  validate/                  small shared configuration checks, if needed
```

These are proposed paths, not new required abstractions. Keep existing
`infra/base` and overlays colocated with their workloads initially. Cluster
inventory remains authoritative for release selection. If production-specific
configuration later becomes mostly fleet-owned, move that wiring toward the
cluster directory then; do not duplicate the same setting in both places.

Keep the current per-workload Flux boundary where failure isolation and migration
ordering benefit from it. A release is a coordinated selection of existing units,
not a requirement to collapse them into one Kustomization.

Options considered:

| Option | Assessment |
| --- | --- |
| Retain monorepo and workload colocation | Recommended now; fits current ownership and scale |
| Centralize every manifest under a global apps directory | Low benefit; weakens source/deployment ownership without fixing promotion |
| Separate application and production-config repositories | Useful when production write access must differ from source-code access; otherwise adds coordination |
| Replace all manifests with bespoke Helm charts | Adds templating/release maintenance for little current gain |
| Use upstream pinned Helm releases for complex third-party services | Reasonable selectively when maintaining NATS/Traefik/OTel lifecycle becomes more costly than adopting their charts; requires helm-controller and explicit CRD ordering |
| Replace Flux with another reconciler | No repository evidence that the reconciler is the limiting factor |
| Add OCI manifest bundles/Flux artifact sharding | Consider later for independently versioned deployment packages or material monorepo scaling needs |

Flux's [repository-structure guide](https://fluxcd.io/flux/guides/repository-structure/)
supports a monorepo with cluster directories and describes separate repositories
as an access/ownership choice. Keep one branch per trunk; represent environments
with directories rather than long-lived environment branches.

As contributors and ownership expand, constrain domain Flux reconciliation with
`spec.serviceAccountName` and namespace-scoped RBAC, leaving platform bootstrap
privileges separate. Current Kustomizations omit that field and therefore rely
on broad controller authority. Add CODEOWNERS/rulesets when there are real separate
review responsibilities. [Flux security guidance](https://fluxcd.io/flux/security/best-practices/)
describes impersonation and multi-tenant controls; applying every multi-tenant
restriction immediately is unnecessary for a single trusted maintainer.

Telemetry should have an explicit acceptable-loss budget. Current exporter
queues are memory-backed; file-offset checkpoints do not persist unsent exports.
Use persistent queues where required, and monitor export failures and saturation.
Keep the documented single-replica OpenObserve tradeoff if acceptable.
[OTel resiliency guidance](https://opentelemetry.io/docs/collector/resiliency/)
explains these controls. Reconcile dashboards/configuration where supported
instead of relying on undocumented manual imports.

## Suggested implementation sequence

| Order | Concrete change | Completion evidence |
| --- | --- | --- |
| 1 | Shared configuration validation; workflow change handling; stable required gate; Action SHA pins; explicit local/bootstrap contexts | A workflow-only change, missing Flux path, invalid platform resource and empty production digest are rejected by the appropriate checks |
| 2 | Local-only disposable DB; production durable binding; encrypted credentials and scoped DB roles; required network changes | Production inventory cannot select the disposable Deployment; restore procedure and ownership are explicit |
| 3 | Build/scan aggregation and domain promotion PRs; initial immutable digests; matching migration release readiness | A partial image-build failure cannot promote a partial new domain release; application waits for the intended migration |
| 4 | Complete Flux self-management; reconciliation/image-automation alerts | Bootstrap leaves Flux installation under Git management; failed reconciliation is surfaced |
| 5 | NATS identities/permissions/network protection; origin trust; certificate lifecycle; resources and availability | Declared access paths and rollout/maintenance behavior match operational requirements |
| 6 | Provisioning ownership; backup/recovery/reseed units; runtime consumer upgrade policy | Cluster, data and feed recovery are executable; shared runtime adoption is domain-controlled |

For a first retained production environment, finish the relevant data/security
items before enabling automatic exposure and promotion. These steps can be small
PRs; a wholesale repository move need not precede them.

## Verification and limits

- `make -C platform/cluster check` passed all six local/production renders.
- `make -C clusters/prod-eu check` passed.
- Offline Skaffold rendering passed for both Identity and Analytics.
- Identity Skaffold diagnosis resolved the shared runtime dependency correctly.
- Rendered manifest output was discarded; no rendered Secret payload was displayed,
  and no Secret was decrypted.
- Local versions: Node 26.11.1, Skaffold 2.25.0, Flux 2.9.6, kubectl 1.37.1 with
  Kustomize 5.8.1.
- Local `flux schema` is unavailable because the CI-installed plugin is absent.
  Schema validation and actionlint were not run locally.
- Docker socket access was denied in the sandbox. Container builds and live
  deployment behavior were not verified.
- No cluster was modified, no workflow was triggered, no remote repository
  settings were changed, and no infrastructure was provisioned.
- Existing modified/untracked documentation was left untouched. This report is
  the only file added.

Supported patterns were checked before reporting: `latest` with digest reflection,
resource-specific migration Job replacement, current GitHub `queue: max` syntax,
and Skaffold sync/dependency behavior are not classified as defects.
