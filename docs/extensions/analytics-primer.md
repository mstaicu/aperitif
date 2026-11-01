# Analytics domain: measurement, data and component choices

Research reviewed on 2026-10-30. This is a first-principles guide and proposed
component selection, not an implementation. Local hosting remains the target;
SaaS equivalents are included for comparison.

## Why PostHog entered the proposal

PostHog Cloud combined product analytics, flags, experiments, warehouse queries
and agent access in one managed application. That matched the earlier priority
of a cohesive workflow with little infrastructure configuration. It was an
implementation convenience, not a universal definition of Analytics.

The local requirement changes its fit: PostHog documents an
[unsupported self-hosted deployment](https://posthog.com/docs/self-host), and
its [current comparison](https://posthog.com/blog/best-open-source-ab-testing-tools)
explicitly excludes A/B testing from the open-source release. Cloud capabilities
must not be assumed locally. Define the measurement and data architecture
before selecting the UI or service.

## What a good domain produces

Analytics makes a decision traceable:

```text
Question → intended action → outcome → metric → source facts
         → reproducible calculation → decision → subsequent evidence
```

Its quality comes from useful answers, owned meaning, known coverage,
reproducibility, operability and controlled cost. No standard container stack
supplies those properties automatically. Source domains own business facts;
Analytics owns its projections, datasets, definitions, reports and models. It
consumes supported contracts/exports, not another domain's private database.

## What to measure

Ask who will change what action if a number changes. Google's
[HEART framework](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/)
maps goals to signals and metrics. That reasoning generalizes; its particular
human-experience categories are not mandatory for every machine or process.

| Question | Candidate measures | Essential definition |
| --- | --- | --- |
| Are we delivering value? | Accepted qualifying outcomes; proportion reaching first value | What counts as useful/accepted and who is eligible |
| Does the process work? | Success, abandonment, expiry, defects, rework | Logical attempts, retries, terminal outcomes and deadlines |
| How quickly does value arrive? | Time to first value/completion; latency distributions | True start, unfinished work and failures/timeouts |
| Do entities return when useful? | Cohort retention; repeat qualifying activity | Cohort origin, return behavior and fully observed windows |
| Is output good? | Acceptance/correctness, satisfaction, complaints | Trustworthy labels and sampling/response bias |
| Is it efficient? | Resource/financial cost per accepted outcome | Attributable costs and consistent units; revenue only if relevant |
| Did a change help? | Experimental effect plus guardrails | Valid assignment/exposure, comparison and uncertainty |
| Can we trust the answer? | Freshness, validity, uniqueness, completeness | Coverage, checks and independent reconciliation |
| Does automation help? | Correct completed work, human effort, regressions and cost | Independent verification and actual downstream results |

These are question families, not a required KPI catalogue. The unit may be a
person, machine, account, resource or logical operation. Retention is not
automatically a success measure for a one-time task. Clicks, logins, messages
and PR counts can be useful diagnostics without establishing value.

Choose a primary outcome, a few guardrails, diagnostics and data-quality checks.
More throughput may be undesirable if quality or rework worsens. Descriptive
analysis asks what happened; diagnosis investigates reasons; prediction
estimates future behavior; experiments estimate an intervention's effect.
An observational association or agent explanation alone does not establish a
causal effect.

## Define the counting unit before the query

Grain states what one row or count represents. Kimball treats
[declaring grain](https://www.kimballgroup.com/2008/11/fact-tables/) as the first
fact-table design step. Event identity, operation identity, account identity
and resource version are different concepts. Delivery retries are not extra
customer outcomes.

An illustrative metric:

```text
Decision: should we change a processing workflow?
Unit: one eligible logical operation
Numerator: distinct eligible logical operations reaching an accepted outcome by the deadline
Denominator: eligible starts whose full outcome window has elapsed
Window: a named cohort and timezone
Guardrails: failure/expiry, output quality and cost per accepted outcome
Evidence: source-owned start/outcome facts and a completeness check
```

If 100 eligible operations have mature windows and 80 reach the accepted
outcome, the rate is 80%, even if retries produce more deliveries. Missing
instrumentation must be investigated; absence alone does not prove failure.
Completion-time statistics among successes need failure/expiry figures beside
them to expose survivorship effects.

Each important metric records owner/decision, grain, population/exclusions,
numerator/denominator, window/timezone, cohort origin, conversion deadline,
source coverage, late-data policy, freshness and SQL/definition version. A
short definition beside versioned SQL is sufficient initially. BI, experiments
and agents should reuse it. Airbnb's
[Minerva](https://medium.com/airbnb-engineering/how-airbnb-achieved-metric-consistency-at-scale-f23cc53dea70)
illustrates inconsistent definitions becoming expensive; it does not make a
custom semantic platform a starting requirement.

## How to collect facts

Instrument the smallest fact set needed by the question. A committed business
result and a browser observation have different provenance. Server outcomes
cannot capture every abandoned interaction; client tracking cannot establish
a committed business result. Sampled traces are not an authoritative financial
or customer ledger.

Specify exact trigger, stable identity, source/contract version, occurrence
time and relevant account/actor/resource/operation context. Allowlist fields;
do not collect authentication material, secrets or unrestricted content.
Historical segmentation needs event-time context or deliberate dimension
history, not today's state joined to yesterday's event.

| Message | Meaning | Analytics behavior |
| --- | --- | --- |
| State snapshot | Current exported representation | Versioned current dimension; no invented transition history |
| Delta/fact | Something happened | Retain approved identity and duplicate-safe analytical effects |
| Command | An owner is requested to act | Execute only Analytics-addressed commands; observe other owners' published request/result facts |

Use owned durable consumers per logical pipeline, shared by replicas. Validate
the producer contract and actual NATS subject. Snapshot writes compare source
versions atomically; delta receipts/effects commit together. ACK follows the
defined durable commit. A cursor cannot restore an empty database or recover
expired history. WorkQueue commands disappear after ACK and are not an archive.
Long jobs can be durably admitted before ACK, with completion recorded later.
See the [consumer plan](analytics-local.md) and [messaging reference](../examples/messaging.md).

## How to organize and store data

Start with logical responsibilities:

| Layer | Purpose | Initial implementation |
| --- | --- | --- |
| Approved source records | Evidence for validation and reprocessing | Receipts/facts and permitted source fields |
| Typed staging | Consistent types, keys and time semantics | SQL tables/views |
| Curated facts and dimensions | Coherent analytical grain and context | Fact/current-dimension tables; history only when needed |
| Shared metrics/marts | Reviewed counting rules | Versioned views/report tables and definitions |
| Consumption | Reports, experiments, models and agent questions | BI/query interface or supported output/API |

All can initially live in one Analytics PostgreSQL database. They are not five
services. Dimensional models, wide tables and views suit different questions;
no single shape is mandatory everywhere.

Separate occurrence, ingestion and report-refresh time. Handle late input and
corrections by recomputing affected windows or applying a defined correction
protocol. Expose coverage/as-of time. Retain stable facts under policy;
immutable identity does not mean keeping everything forever. Plan deletion
and replay together so removed data is not silently restored.

Use PostgreSQL for transactional landing, constraints, current projections and
modest analytical scans. Add columnar storage when measured scan latency,
concurrency or cost warrants it; ClickHouse is a candidate. Its insert-retry
deduplication is not indefinite event uniqueness, so canonical query/export
semantics still require verification. Object storage can hold bulk exports,
training inputs and artefacts. A lake needs deliberate layout, discovery and
lifecycle choices; transactional tables, compaction and coordination become
relevant when updates, concurrent writes or small-file management require them.

There is no universal row threshold for changing storage. Measure latency,
scanned bytes, concurrency, ingestion/restore time and operating cost.

## Operate trustworthy answers

Set freshness at the decision's timescale; a morning report does not
automatically need second-level streaming. Observe source progress, ingestion,
transformation and report refresh separately. Check contract/key validity,
uniqueness, conflicting identities and duplicate-safe effects. Reconcile
critical totals with source-owned controls or supported exports. Rehearse
replay, backfill overlap, backup/restore and corrected calculations.

Quiet sources, delayed events and stalled ingestion are different conditions.
Google/Spotify's [SRE pipeline guidance](https://sre.google/workbook/data-processing/)
shows why end-to-end reliability needs explicit requirements. OpenObserve can
monitor those signals; Analytics owns analytical meaning and correctness.
Every dataset also needs an owner, permitted fields/users, retention and
deletion behavior, including relevant archives and derived outputs.

## Experiments, models and agents

Flags provide rollout control. Experiments add a scientific comparison. Choose
the randomization unit deliberately: account-level behavior cannot be analyzed
as independently assigned members. Define common control/treatment exposure
opportunity before treatment-dependent outcomes. Record primary metric,
guardrails, conversion window and the chosen analysis/stopping procedure.
Validate A/A behavior and allocation/sample-ratio mismatch before trusting
effects. [Microsoft's SRM research](https://www.microsoft.com/en-us/research/articles/diagnosing-sample-ratio-mismatch-in-a-b-testing/)
explains how instrumentation and analysis can invalidate plausible results.
An inconclusive result or prevented regression may still be valuable learning.

Models need suitable labels, point-in-time features, retained inputs/cutoff,
code/environment versions, held-out evaluation and a consumer. A reviewed
Python Job is enough to begin. Offline accuracy and real-world value are
different measures. Spotify's
[separation of personalization and experimentation](https://engineering.atspotify.com/2026/1/why-we-use-separate-tech-stacks-for-personalization-and-experimentation)
preserves that distinction.

Agents consume the same governed evidence and definitions. Measure correct
completed work, human effort, regressions and cost per useful outcome. Code,
merge and deployment authority is separate from evidence access. No agent
coordinator is required for the first dataset, report or model.

## Components we can deploy

| Capability | Local container candidate | SaaS comparison |
| --- | --- | --- |
| Owned transactional analytical data | Official `postgres` | Managed PostgreSQL appropriate to the environment |
| Internal reporting/exploration | `metabase/metabase` OSS | Metabase Cloud |
| Flags/experimentation | `growthbook/growthbook` plus Mongo-compatible metadata | GrowthBook Cloud; PostHog Cloud for broader integrated product analytics |
| Larger analytical scans | `clickhouse/clickhouse-server` | ClickHouse Cloud |
| Alternative BI | `apache/superset`, instead of Metabase | Managed BI only for a demonstrated workflow |
| Analysis/models | Reviewed pinned SQL/Python job image | Managed execution for a concrete workload |

Official deployment references: [PostgreSQL](https://hub.docker.com/_/postgres),
[Metabase Docker](https://www.metabase.com/docs/latest/installation-and-operation/running-metabase-on-docker),
[GrowthBook](https://docs.growthbook.io/self-host),
[ClickHouse Docker](https://clickhouse.com/docs/install/docker),
[Superset Compose](https://superset.apache.org/docs/installation/docker-compose/).
Managed references: [Metabase Cloud](https://www.metabase.com/cloud),
[GrowthBook managed warehouse](https://docs.growthbook.io/app/managed-warehouse),
[PostHog warehouse](https://posthog.com/docs/data-warehouse),
[ClickHouse Cloud](https://clickhouse.com/cloud).

Pin tested versions/digests and verify local CPU compatibility. These are image
candidates, not a runnable manifest. Persist data and metadata deliberately.

Metabase needs an application metadata database plus an analytical read
connection. Use PostgreSQL for retained use rather than its default H2.
Separate metadata/analytical databases and roles may share the same
Analytics-owned server initially. Its data connection reads approved views,
not Identity/Product databases. [Application database guidance](https://www.metabase.com/docs/latest/installation-and-operation/configuring-application-database).

GrowthBook requires Mongo-compatible metadata separately from its PostgreSQL
analytical source. Basic self-hosted experiments exist; advanced statistics
and governance have [edition-specific gates](https://www.growthbook.io/pricing).
Its MIT license excludes Enterprise directories. MongoDB has SSPL terms;
FerretDB is an alternative with its own dependencies and compatibility needs:
[v2 needs PostgreSQL with the DocumentDB extension](https://docs.ferretdb.io/migration/migrating-from-v1/)
plus a separate service, not an ordinary additional PostgreSQL schema.
Metabase OSS is [AGPL](https://www.metabase.com/license), with separate commercial
features; Superset/ClickHouse use Apache 2.0. Review required access/embedding
features rather than assuming every capability is free.

## Small local assemblies

For a first reporting use case:

```text
Existing source facts / NATS
  → one Analytics projector
  → PostgreSQL: retained data, curated views and metric definitions
  → Metabase: one useful report

Operational telemetry → existing OpenObserve
```

This adds one first-party workload, one owned PostgreSQL server and one BI app.
Metabase metadata can share that server in its own database. It provides a
usable analytical domain without an experiment or agent loop.

When experimentation is selected, add GrowthBook/metadata and Product
SDK/exposure integration over the approved data. When measured scans warrant
it, add ClickHouse and a proven replay-safe export path. A SQL/Python job can
precede either addition. dbt, Dagster and MLflow address later demonstrated
transformation, orchestration and model-lifecycle needs.

Current public inputs supply account/initial-owner membership snapshots, not
complete signup, activity, conversion or retention history. The first Product
measurement still needs authoritative facts. Start with one decision and a
few precise inputs; prove replay and the answer, then let the next useful
consumer justify the next component.
