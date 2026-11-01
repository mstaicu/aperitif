# Analytics: local deployment and durable NATS consumers

Status: Proposed. Reviewed on 2026-10-30 after the deployment target was
clarified as local/self-hosted. No workloads have been implemented or started.
Use the existing local Kubernetes environment as the default placement for
first-party Analytics workloads. Local hosting does not imply offline model
inference; that is a separate requirement if selected.

For measurement/storage foundations and a smaller reporting-first assembly
using PostgreSQL and Metabase, start with the [analytics crash course](analytics-primer.md).
The PostHog/GrowthBook discussion here evaluates those optional capabilities;
neither application is required for the first retained dataset and SQL report.

## Local changes the PostHog selection

The earlier PostHog recommendation relied on Cloud capabilities. Current
[self-host guidance](https://posthog.com/docs/self-host) provides an unsupported
hobby Docker Compose path, not a maintained Kubernetes deployment. The vendor
does not provide tagged self-host releases or paid self-host support. Its
[A/B testing comparison](https://posthog.com/blog/best-open-source-ab-testing-tools)
explicitly says experimentation is not included in the open-source release.

Therefore a local PostHog deployment is an evaluation candidate for the
analytics/flag functionality it actually supplies. It is not established as
the complete local experimentation and managed-agent baseline previously
described. Do not replace the selected product silently; validate that local
scope before implementing its integration.

If the required local baseline includes ordinary A/B experiments, the
recommended alternative is **self-hosted GrowthBook + Analytics PostgreSQL**.
It has an official [self-hosted application](https://docs.growthbook.io/self-host)
and [Kubernetes deployment path](https://docs.growthbook.io/self-host/kubernetes).
The app needs a separate MongoDB-compatible metadata store and can use
[Analytics PostgreSQL as its analytical data source](https://docs.growthbook.io/self-host/config).
That is an explicit alternative component choice, not an already authorized
replacement deployment. No separate ClickHouse is needed for this first slice.

## Placement

| Component | Where | Ownership |
| --- | --- | --- |
| NATS JetStream | Existing local Kubernetes namespace `nats` | Platform supplies broker; each source owns streams/contracts |
| OTel/OpenObserve | Existing local Kubernetes namespace `otel` | Platform operational telemetry |
| Analytics PostgreSQL | Local Kubernetes namespace `analytics` | Analytics data, receipts/projections and any owned job state |
| Migrations and ingestion | `domains/analytics`, namespace `analytics` | Analytics-owned first-party workloads |
| Long analysis/agent jobs | Local process initially, or bounded Kubernetes Jobs when needed | Analytics analyses, or the repository owner for engineering tasks |
| PostHog, if retained | Official hobby Compose on an isolated local Linux VM beside the cluster | Analytics operates the whole vendor stack |
| PostHog MCP, if needed | Separate local service pointing at local PostHog | Analytics/engineering tool integration |
| GrowthBook, if selected instead | Local Kubernetes app and metadata dependency in `analytics` | Analytics experimentation capability |

In-cluster Analytics workers use `nats://nats-client.nats.svc.cluster.local:4222`
and OTLP HTTP at `http://otel-collector.otel.svc.cluster.local:4318`.
Use normal cluster Services for PostgreSQL. Do not expose NATS or databases to
the browser.

The PostHog hobby VM guidance is approximately 4 vCPU, 16 GB RAM and more than
30 GB disk for that stack, separately from the existing cluster. It is vendor
guidance for a hobby installation, not measured sizing for this platform.
Its [Compose stack](https://github.com/PostHog/posthog/blob/master/docker-compose.hobby.yml)
includes ClickHouse, Kafka, PostgreSQL, Redis/Valkey, Temporal and object storage
among other services. Do not translate that bundle into our own Kubernetes
charts or replace its internal Kafka with platform NATS.

Use a distinct VM address or web port: the repository's local Traefik already
uses `localhost:80`. The upstream installer expects domain/TLS setup; it is not
a zero-change localhost installer. Inspect a pinned upstream revision and
configure the Compose local URL/ports before running it. Retain its selected
compose revision/image identities and data volumes for reproducibility.

Analytics PostgreSQL is separate from PostHog's internal metadata database.
Only approved Analytics tables may be connected to the UI. Verify native
warehouse-source availability against the actual local build before promising
source synchronization; no Identity or Product database credentials are given
to PostHog. The first dataset/query remains useful without that integration.

## One workload, multiple durable consumers

Follow [domain ownership](../domains.md) and the executable
[messaging reference](../examples/messaging.md). One ingestion Deployment can
host several handlers/consumers; a consumer belongs to a logical pipeline on
a stream, not to a pod. Replicas of one pipeline share its durable. Independent
effects have independent consumer positions.

The following names are proposed examples, not existing contracts or resources:

| Message | Stream and durable | Handling |
| --- | --- | --- |
| Account state | Existing `IDENTITY`; `analytics-identity-accounts-v1`; filter `identity.account.v1.*` | `LastPerSubject` on initial creation; atomic source-version upsert |
| Membership state | Existing `IDENTITY`; `analytics-identity-memberships-v1`; filter `identity.membership.v1.*` | Same pattern; retain only needed fields |
| Product deltas/outcomes | Source-owned Limits stream; `analytics-product-outcomes-v1`; exact supported filters | `DeliverAll` or a documented start; receipt and fact/aggregate effects commit together |
| Analytics commands | Analytics-owned WorkQueue stream; `analytics-analysis-commands-v1`; commands addressed to Analytics | Execute a short owned effect or durably admit an owned job before ACK |

The current public inputs implement only Identity state snapshots. Product
delta/outcome and Analytics command contracts must be introduced with a real
use case. Do not configure consumers against invented subjects and treat them
as implemented data sources. Source domains retain ownership of their stream
configuration; Analytics does not take over the `IDENTITY` stream.

Use durable pull consumers with explicit ACK, bounded batches/bytes and measured
`AckWait`. Validate the pinned producer contract and actual transport subject.
Resume compatible consumer definitions; fail visibly on an incompatible
definition rather than deleting/resetting progress automatically.

For **state**, compare resource versions and update in one SQL transaction.
`LastPerSubject` is initial delivery policy, not a rescan after every restart.
If the projection database is lost/reset, a fresh/reset consumer is required
to rebuild it. An old ACK cursor cannot populate an empty table. Current-state
feeds cannot reconstruct intermediate transitions; current Identity feeds do
not define deletion history or complete cross-resource bootstrap semantics.

For **deltas**, commit deduplication keyed by `(pipeline, source, id)` and the
required effect together. Keep receipt evidence for the supported replay
horizon. The relay does not guarantee resource order; noncommutative deltas
need their own sequencing/gap contract. Source retention limits and supported
backfills define how much history can actually be rebuilt.

In all cases, ACK only after the defined durable SQL effect. A crash after
commit/before ACK must yield a duplicate-safe no-op. A storage failure leaves
the message unacknowledged. Invalid input follows an explicit failure/repair
policy; any future quarantine must persist approved diagnostic material before
parking input. `MaxDeliver` alone does not create a dead-letter queue.

## Commands are execution, not passive analytics input

Analytics executes only commands addressed to its own capability. Do not add
an observer to another domain's WorkQueue command subjects: overlapping
consumers are restricted and acknowledged commands are removed. Observe that
domain's published request/result facts on retained Limits subjects instead.
See [NATS retention](https://docs.nats.io/learn/jetstream/retention-policies).

For long analytical or agent work, define the command's acknowledged effect
as durable job admission:

```text
Analytics-addressed command
  → transaction: receipt + retained job row (+ accepted-result outbox if needed)
  → ACK
  → bounded worker/Job executes using retained datasets
  → transaction: final job state + completion/failure fact outbox
```

The command contract must distinguish acceptance from completion. Add the
existing generic outbox relay as an Analytics-owned workload only when
publishing supported results. External model/API calls are not atomic with
PostgreSQL; use stable operation identity, supported provider idempotency and
recoverable job state. A terminal business rejection is a persisted result,
not an infinite retry. Back up retained job state: WorkQueue ACK removes the
command that admitted it.

## The smallest local agent baseline

Start one local task with an approved query interface over Analytics-owned
datasets. Its first result can be an evidence-linked finding or analysis; it
does not need command execution, deployment permissions or a coordinator.
Add the durable job/command path only when asynchronous work is requested.

The official [PostHog MCP server source](https://github.com/PostHog/posthog/blob/master/services/mcp/README.md)
documents local/on-prem hosting and `POSTHOG_API_BASE_URL` for a self-hosted
backend. It is a separate service with Redis session storage, not automatically
part of the hobby installation. It exposes only what that backend actually
supports; it does not unlock missing experiment features.

Self-hosted PostHog [environment configuration](https://posthog.com/docs/self-host/configure/environment-variables)
also documents basic AI assistance through configured model providers. It would
be inaccurate to say all local AI functionality is absent. Cloud Tasks,
Self-driving and workflow-agent feature parity remain unverified locally and
are not prerequisites of this baseline. Local infrastructure also does not
automatically make an external model API local inference.

Operational observations remain in OpenObserve. Its private endpoint and OSS
MCP permissions need deliberate handling if an agent later queries it. GitHub
shared cloud automations are not selected for this local-only starting scope.
Engineering agents can continue proposing changes through the normal
repository checks; production delivery remains a separate capability.

## Repository assembly and independent checks

```text
domains/analytics/
  workloads/
    postgres/          owned local data, persistence when retention matters
    migrations/        projection/fact schema, receipts and jobs when selected
    ingestion/         only required durable consumers/handlers
    jobs/              only once bounded background work is selected
    outbox-relay/      only once supported result publication is selected
  Makefile             check, up, dev, down
  skaffold.yaml        selected workload composition
```

Use workload-owned `infra/base` and `infra/overlays/local` with domain Skaffold
composition. The existing Identity local PostgreSQL is disposable; copy its
development workflow, not an assumption of retained history. Configure
persistence when Analytics must retain facts/jobs. Durable broker cursors do
not replace database persistence.

The already implemented platform setup commands are:

```sh
kubectl apply -k platform/cluster/ingress/overlays/local
kubectl apply -k platform/cluster/event-bus/overlays/local
kubectl apply -k platform/cluster/observability/overlays/local
```

The existing broker has three servers; source stream replication follows the
repository's three-replica pattern. After Analytics is implemented, its `up`
target should start PostgreSQL, run/wait for migrations and start the selected
workers. A `make -C domains/analytics up` target does not exist yet.

Validate that future domain with `make -C domains/analytics check`, requiring
a working Docker-compatible runtime. The first data slice proves versioned
state, duplicate/concurrent delta delivery, commit-before-ACK recovery and
explicit rebuild. The command slice separately proves admission retry and
retained job/result recovery. A local query/agent finding can be accepted
before any PostHog, experiment or automatic release integration.

Use local credentials without committing real secrets; never decrypt encrypted
Secrets in place. Sanitize rendered Secrets before inspection as required by
the repository instructions. A retained on-prem environment also needs backup,
restore and measured capacity; the disposable local development overlay does
not supply those guarantees automatically.
