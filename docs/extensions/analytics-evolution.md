# Analytics: minimal topology and evolution

Status: Proposed. Research reviewed on 2026-10-30. No Analytics workload, new
event contract or schema change is implemented by this document.

This develops [Analytics as a domain](analytics.md) into a staged plan using the
existing platform. The order aims for the highest expected decision value per
instrumentation and operating cost. It is engineering judgment, not a measured
ROI ranking that applies to every business. A reusable framework can establish
how to measure value; each Product must define what value means.

## Lessons to borrow from production

| Source                                                                                                                                                                                                                                                                             | Observed practice                                                                                                                         | Small-platform application                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Spotify event delivery](https://engineering.atspotify.com/2019/11/spotifys-event-delivery-life-in-the-cloud)                                                                                                                                                                      | Typed event contracts coexist with managed messaging, storage and processing.                                                             | Own the interfaces and datasets; use managed infrastructure where it reduces operating work. Do not copy a separate pipeline for every event.                                      |
| [Google SRE / Spotify case study](https://sre.google/workbook/data-processing/)                                                                                                                                                                                                    | Delivery timeliness and completeness are operated explicitly; receiving data is distinct from its business accuracy.                      | Check dataset freshness and completeness, not just pod or broker health. Source owners define the meaning of facts.                                                                |
| [Airbnb Minerva](https://medium.com/airbnb-engineering/how-airbnb-achieved-metric-consistency-at-scale-f23cc53dea70)                                                                                                                                                               | Divergent derived tables and definitions created inconsistent metrics; owned foundational datasets and common definitions addressed this. | Start with versioned SQL and short metric definitions. A semantic platform is a later response to duplicated definitions, not a prerequisite.                                      |
| [Uber streaming ingestion](https://www.uber.com/qa/en/blog/from-batch-to-streaming-accelerating-data-freshness-in-ubers-data-lake/)                                                                                                                                                | Freshness and cost needs motivated streaming; destination commits and processing checkpoints had to recover together.                     | Select freshness from the decision. Prove replay and sink commits before adding throughput. Uber's economics do not establish that a distributed streaming engine is cheaper here. |
| [Google HEART](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/)                                                                                                                                            | Product goals are mapped to observable signals and metrics.                                                                               | Begin with a question and an action, rather than whichever counts happen to be available.                                                                                          |
| [GitLab event definitions](https://docs.gitlab.com/development/internal_analytics/internal_event_instrumentation/event_definition_guide/) and [metric definitions](https://docs.gitlab.com/development/internal_analytics/internal_event_instrumentation/metric_definition_guide/) | Event meaning and ownership are defined separately from metric selectors, unique entities and time windows.                               | Reuse domain contracts and maintain a small definition beside each metric's SQL. No custom event registry or generator is required.                                                |

These are different systems at different scales. The stages below are our
synthesis of those lessons, not their exact architectures or a requirement to
adopt data mesh.

## What this platform actually provides

Reuse the native NATS consumer APIs, PostgreSQL and Flyway patterns, container
Deployments, bounded Jobs/CronJobs, Skaffold/Kustomize, Flux/image delivery,
ingress and OTel/OpenObserve already present in the repository. The broker is
the existing three-server JetStream cluster. Keep the relay payload-agnostic.

There is no Analytics ingestion service, warehouse/lake integration, BI service,
model runtime, workflow engine or general managed-resource provisioner yet.
The [existing production prerequisites](../roadmap.md#before-sustained-production)
still apply; this proposal does not implement them or add another infrastructure
framework.

The only implemented public input families are:

| Input                                                                                                  | Actual payload fields                                  | Honest use today                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------- |
| [Account snapshot](../../domains/identity/contracts/src/events/identity.account.snapshot.v1.mjs)       | `id`, `name`, `version`                                | Current account context.                    |
| [Membership snapshot](../../domains/identity/contracts/src/events/identity.membership.snapshot.v1.mjs) | `id`, `account_id`, `principal_id`, `roles`, `version` | Current initial-owner relationship context. |

[Account creation](../../domains/identity/workloads/api/src/services/accounts/create.mjs)
publishes both initial snapshots. Registration/login do not publish analytics
facts. These contracts have no creation/occurrence timestamps or active/deleted
fields. Membership updates, signup facts, usage facts and commercial facts are
not implemented. Consequently these inputs alone cannot establish signup cohorts,
activation, retention or historical membership. A missing row or message does
not prove inactivity or deletion.

## Minimal useful topology

```text
Existing source-domain streams
  -> one Analytics ingestion Deployment
  -> Analytics-owned PostgreSQL
       received facts + current dimensions + SQL views/report tables
  -> existing SQL or BI interface
```

Use deployed PostgreSQL locally and managed PostgreSQL in production as the
lowest-friction starting recommendation. Analytics owns a separate database and
credentials; this does not require a dedicated database server for every domain.
It never queries Identity's private database. SQL tables/views may share this
one Analytics database initially; raw, modeled and reporting data do not each
need a service or storage product.

```text
domains/analytics/
  workloads/
    postgres/       local dependency, if PostgreSQL is selected
    migrations/     owned tables, views and definitions in SQL
    ingestion/      native JetStream consumer + pg writes
  Makefile
  skaffold.yaml
```

Run multiple subject filters/consumers in the same worker where practical; one
new event type does not imply one new service. A separately managed database or
warehouse needs connection, credential and network configuration, not a
placeholder container. Reuse environment overlays and the existing secret
handling policy. Use workload credentials, not an engineer's personal token.

Ingestion owns validation and progress. Store the approved source event and its
identity when later reprocessing is required; maintain current dimensions using
atomic version comparisons. In PostgreSQL, deduplication and stored effects must
commit together before acknowledgement. A rebuildable snapshot projection can
use a fresh `last_per_subject` scan; an ingestion pipeline needing a resumable
cursor uses its own durable pull consumer. Replicas share that logical consumer.

No API, custom UI, Analytics outbox/relay, contracts package, workflow engine or
model service is required for this starting topology. Add an outbox only when
Analytics itself publishes supported messages. Implementation examples live in
the [messaging reference](../examples/messaging.md).

## Evolve topology only at a demonstrated boundary

| Stage                    | Smallest addition                                                                                                                                        | Trigger / evidence needed                                                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T0: measurement decision | One metric definition and source-contract inventory; no deployment.                                                                                      | A named decision owner can explain what action the result will change.                                                                                                              |
| T1: trustworthy dataset  | The minimal topology above; SQL views first, a bounded transform Job/CronJob if needed.                                                                  | Required source facts exist or their producers are explicitly planned. Prove one useful report and replay-safe ingestion.                                                           |
| T2: analytical storage   | Choose a managed columnar warehouse **or** object storage with an appropriate table/query format. Keep or replace the SQL landing boundary deliberately. | Measured history size, scan cost, query interference, concurrency or recovery needs exceed the initial store's agreed budget. Do not automatically add both a warehouse and a lake. |
| T3: models and serving   | A bounded training/scoring Job or managed job, then an API/UI only for a real consumer.                                                                  | A useful report/rule baseline exists; repeatable inputs, labels, evaluation and a decision that benefits from the model are available. Models do not require T2 first.              |
| T4: isolate bottlenecks  | Split a busy ingestion workload, add dependency-aware orchestration or a distributed processor individually.                                             | A measured throughput/freshness bottleneck or dependency/backfill burden cannot be addressed by the simpler stage. New infrastructure must have an owner and recovery plan.         |

For T2, managed services reduce infrastructure operation; deployed services offer
control at the cost of operating storage, upgrades and recovery. Start managed
unless a concrete requirement justifies that work. Product selection depends on
the cloud, data size, query pattern and operating budget; no vendor or fixed row
threshold is selected here.

The PostgreSQL transaction example is not a universal warehouse connector.
BigQuery [does not enforce key constraints](https://docs.cloud.google.com/bigquery/docs/primary-foreign-keys),
and Snowflake standard tables [do not enforce primary/unique keys](https://docs.snowflake.com/en/sql-reference/constraints-overview).
Verify the chosen sink's deduplication, concurrent-write and commit semantics.
For object storage, use a replay-safe deterministic object/batch identity and
committed manifest or transactional table protocol; a checkpoint row in another
database does not make an upload atomic. Batch files deliberately rather than
creating one tiny file per event. Acknowledge only after the selected durable
commit boundary, then test failure on both sides of that boundary.

Training runs against stored datasets, not unacknowledged broker deliveries.
Record the input snapshot/coverage, feature cutoff, code and model versions,
evaluation and output version. Prevent future information leaking into historical
training examples. Add online serving or feature infrastructure only for an
actual latency, freshness or reuse requirement.

## Evolve event coverage independently of infrastructure

This is a priority order for questions, not a mandatory catalogue. Steps can run
on the initial SQL store. Paid/free, B2B/B2C and human/machine are optional axes;
none is the universal business model. Names below describe facts to design, not
implemented contracts or a mandatory generic `action/properties` envelope.

| Stage and decision                                               | Minimum additional inputs                                                                                                                                      | What it enables / important limit                                                                                                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E0: who and what does this data describe?                        | Existing account/owner-membership snapshots as current dimensions; known input coverage.                                                                       | Context for later activity. Initial ingestion time is not creation time or a complete historical cohort.                                                                              |
| E1: does the product deliver value?                              | One to three Product-owned, committed outcome facts with true occurrence time and applicable actor/account/resource context.                                   | Qualifying activity and repeated delivered outcomes. The Product chooses the value-producing action; login, token refresh, polling and resource creation are not automatically value. |
| E2: who reaches first value and returns?                         | A real creation/eligibility/start fact for the chosen cohort, plus E1 outcomes. Historical membership/eligibility changes only if that question requires them. | Time to first value, activation and retention with a valid denominator. Do not infer absent historical facts from current state or first observation.                                 |
| E3: where does a demonstrated journey fail?                      | The selected journey's logical start/attempt and terminal outcomes; only the necessary client observations, correlated by operation/resource ID.               | Task success and step conversion. Completion-only data has no attempt denominator; a click establishes an observation/intent, not a committed outcome.                                |
| E4: which additional business axis changes a decision?           | As applicable: acquisition attribution, collaboration changes, invoice/payment/refund facts, entitlements or automated job outcomes.                           | Segment or financial questions that actually apply. Do not introduce subscription events for every product or equate cancellation, inactivity and revenue churn.                      |
| E5: did an intervention help, or can a model improve a decision? | For experiments: assignment, actual exposure and outcomes at a chosen randomization unit. For prediction: point-in-time features and trustworthy labels.       | Experiments or evaluated models when justified. Observational correlations do not establish causality; a useful rule/report is the baseline.                                          |

Committed server-side outcomes usually provide the best first evidence of
delivered value in this platform. Browser events may be necessary for exposure or
abandonment, but add an authenticated/appropriately controlled collection path
only when needed; browsers do not connect directly to NATS. Select and validate
client properties rather than accepting arbitrary event payloads as business
truth. External-provider facts enter through an owned integration that handles
provider IDs, retries and corrected/reconciled results.

Historical facts need a Limits stream without the snapshot cap of one message
per subject. Group subjects with the same retention requirements rather than
creating a stream per event. Keep their subjects disjoint from snapshot subjects:
the current Identity stream captures `identity.account.*.*`, so a proposed shared
subject `identity.account.created.v1` would accidentally match the snapshot
stream. A separate namespace such as `identity.events.account.created.v1` avoids
that overlap. These are naming examples, not implemented contracts. Add the
appropriate source-owned stream configuration and producer contract; the relay
needs no event-type branch.

An attempted business operation whose transaction rolls back cannot preserve
its failure event in that same transaction. A persisted workflow failure may
emit a fact with the transaction recording that failure; other attempts require
an explicitly designed durable capture path. Do not claim outbox success events
alone measure all rejected requests or outages.

Operational errors, resource usage, HTTP latency and traces remain in the existing
observability system. Export a defined product-level outcome when a business
metric needs it; do not reconstruct financial or customer facts from sampled
traces, infrastructure logs or third-party dashboards.

## Small field additions to consider now

These are proposals for source contracts, not changes to the relay or a completed
migration. Keep stable event IDs, `source`, `type`, `specversion` and resource
versions already present.

| Field                        | Source and recommendation                                                                                                         | Meaning / limit                                                                                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account `data.created_at`    | Expose the existing `accounts.created_at` in the Account snapshot.                                                                | Authoritative account creation time survives snapshot replacement/replay. It is not principal signup time or proof of a complete population of accounts deleted before observation. |
| Membership `data.created_at` | Add a recorded source creation timestamp, then export it. The current membership table has no such column.                        | When that relationship began. It does not reconstruct later role changes or membership removals.                                                                                    |
| CloudEvent `time`            | Define and validate source-time semantics when adding it. Require a documented occurrence time for new historical fact contracts. | Source occurrence/recorded business time, not relay publish time or sink ingestion time. Current snapshot contracts do not provide it.                                              |

If records already exist, do not backfill missing creation times with migration
time and claim they are historical truth. Record known coverage or unknowns.
Apply the repository's contract compatibility/release rules when changing the
published wire shape. SQL timestamps need explicit serialization and contract
validation, not unvalidated optional extension values.

CloudEvents `time` is optional in the standard. Where actual occurrence time is
unavailable, the standard permits a substitute time but requires producers for
the same source to use a consistent algorithm. Document that policy in the
source contract; Analytics must not invent a business timestamp. See the
[CloudEvents specification](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md).
Do not add `updated_at`, status/deletion fields or generic actor fields merely
as placeholders. Add their source semantics with the operation needing them.
`queued_at` and an extra global sequence are not needed for this plan.

For future historical Product facts, define the following only where applicable:

| Field/concept                   | Rule                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `(source, id)`                  | Stable identity of one event; retain it on delivery retry. A business operation ID may additionally prevent duplicate producer execution.                  |
| `type` and contract version     | Describe a concrete domain fact and validate its payload. Resource version, contract version and model/metric version are different concepts.              |
| `time`                          | The source fact's occurrence time, with documented UTC/time semantics. It is not a global ordering mechanism or necessarily a database commit timestamp.   |
| `account_id`                    | Account/customer attribution where the resource belongs to an Account; do not invent it for pre-account or genuinely unscoped facts.                       |
| Actor identity                  | Approved principal/actor identifier when the question needs it. Account and actor are different grains; avoid importing an entire person profile.          |
| Resource and operation identity | Correlate a meaningful logical operation and its outcomes; HTTP retries and repeated messages are not additional customer actions.                         |
| Event-time context              | Include the small context needed by the metric, or maintain a deliberate historical dimension. Today's membership/plan must not masquerade as yesterday's. |

At the sink, record `ingested_at` separately and preserve relevant source/subject
and coverage information. Record report refresh time separately again. Add
session or pseudonymous client identity only for a selected journey that needs
it; neither a session nor authentication proves product value.

Never ingest passkey material, tokens/token hashes, authentication challenges,
secrets or unrestricted customer content. Approve the identifier/property list
and its retention/access/deletion rules for each dataset. Pseudonymous IDs are
still potentially linkable data. Do not retain unnecessary account names just
because the snapshot includes them.

## The measurement framework

Use this sequence for every proposed addition:

```text
Decision -> desired outcome -> observable signal -> metric definition
         -> required facts/context -> smallest missing event set -> validation
```

Put a short definition beside the metric's versioned SQL. Link source contracts
instead of creating another schema registry. A definition must state:

```text
Question and decision owner:
Action this result will change:
Counting grain: actor | actor/account | account | resource | logical operation
Numerator and denominator:
Population, exclusions and cohort origin:
Time window, timezone, cohort maturity and late-data correction policy:
Required facts, source owners and authoritative triggers:
Available / missing inputs; historical coverage begins:
SQL/definition version, freshness target and validation example:
```

For each new source event, record its exact trigger, source owner, type/version,
identity/retry policy, occurrence-time meaning, applicable context, allowed
properties and the metric/consumer it serves. One Markdown definition and the
normal domain contract are sufficient initially. Do not make a shared tracking
package, global event enum or universal property bag a prerequisite.

### Definitions that prevent misleading numbers

- **Activity:** distinct eligible entities performing named qualifying outcomes
  in the chosen window. Message count, login count and account count are
  different metrics. Separate automated and human activity when that matters;
  automated outcomes may themselves be the product's value.
- **Activation:** a Product-defined first-value condition within a stated window
  from a real eligible starting fact. No universal login-based definition.
- **Retention:** a specified creation/first-value cohort returning to a qualifying
  outcome in a specified later window. Include only cohorts whose return window
  is fully observable; immature cohorts are not failures.
- **Task success:** distinct successful logical operations divided by distinct
  eligible attempts. Define pending, cancellation, expiry and retry handling.
- **Segmentation:** joining a current dimension labels current context. Analysis
  of historical plan/role/state needs event-time context or maintained history;
  a late snapshot cannot fill that gap retroactively.

Keep raw approved facts separate from derived metric definitions so a corrected
query can be rerun. Late or backfilled events may revise affected reports;
publish a coverage/as-of or provisional status where that changes interpretation.
Compare cohorts rather than treating growth in total usage as improved retention.

## Minimum confidence and recovery

Begin with three checks for the first useful dataset:

1. **Freshness:** can it meet its agreed report deadline? Track ingestion and
   transform progress; a quiet source is not itself an outage. Old/late/backfilled
   event times are distinct from a stuck consumer.
2. **Validity:** are required contracts/keys/context valid and are duplicates
   handled? Make invalid or conflicting input visible; never silently count it
   as a new fact or acknowledge a required fact that was not persisted.
3. **Completeness:** reconcile critical logical facts against source-owned
   control totals or supported exports when that guarantee is required. A cursor
   alone proves neither complete source instrumentation nor correct reporting.

Backfill through a supported source-owned export or producer job, not private
cross-domain SQL. Preserve historical fact identities on replay. State reseeds
follow the existing snapshot version/coalescing contract; they are not new
historical transitions. Record when coverage actually began and avoid double
counting overlap between backfill and live ingestion.

A Limits stream keeps events within its configured limits independently of
consumer acknowledgements; it is not permanent analytical storage. A cursor
cannot recover expired/deleted history. See
[NATS retention](https://docs.nats.io/learn/jetstream/retention-policies).
Persisted snapshots represent observed current state, not every intermediate
transition. There is no source-order guarantee in the relay: commutative counts
can use occurrence-time windows, while genuinely order-dependent changes need
an explicit sequence/gap protocol at producers and consumers.

Before rollout, verify duplicate/concurrent delivery, commit-before-ack failure,
sink failure, late input, replay/backfill overlap, snapshot rebuild and contract
rejection against the selected sink. Show that the first report changes a real
decision before adding another infrastructure stage or a larger event catalogue.
