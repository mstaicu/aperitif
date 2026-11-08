# Analytics foundation

```text
Identity tables + outbox → existing relay → JetStream
  → Analytics identity-v1 projector → PostgreSQL history/current state → SQL views
```

The source contracts and stored facts are independent of the eventual analytics
tool. A future destination adapter handles that tool's ingestion protocol;
Identity does not import an analytics SDK or publish a vendor's event format.

## Ownership

| Responsibility | Accountable role |
| --- | --- |
| Authoritative state, business meaning, contracts and transactional facts | Source domain team |
| Analytical ingestion, datasets, metric definitions, quality, access and research | Analytics team |
| Experiment hypothesis, treatment behavior, exposure instrumentation and ship decision | Team owning the behavior |
| Experiment design, statistical analysis and interpretation | Analytics with the team running the experiment |
| Flag configuration, assignment and evaluation infrastructure | A selected service operator; Analytics or Platform can fill this role |
| Shared broker, telemetry collection and delivery infrastructure | Platform team |
| Release policy, service health, canary/blue-green promotion and recovery | Workload owner using Platform infrastructure |

These are recommended accountability boundaries for this platform, not a
universal organization chart. One team can fill several roles. Operating a tool
in the Analytics namespace does not transfer ownership of every feature it offers.
[Spotify's Search teams](https://engineering.atspotify.com/2022/2/search-journey-towards-better-experimentation-practices)
run hypothesis-driven experiments with analytical guidance; Uber
[separates experiment analysis from configuration and serving](https://www.uber.com/us/en/blog/supercharging-a-b-testing-at-uber/).

A flag controls behavior. Assignment selects a variant; actual exposure records
its relevant application; outcomes record subsequent behavior. A randomized
A/B test compares control and treatment groups using these observations to
estimate an effect; assignment and analysis must preserve comparable groups.
A flag ramp alone does not establish that effect. Canary and blue-green are
deployment strategies; their controllers
can use analytical or operational evidence to enforce the workload's release
policy, as illustrated by [Argo's analysis integration](https://argoproj.github.io/argo-rollouts/features/analysis/).
None of these tools is required for the current ingestion and SQL baseline.

## Two outputs from each domain

```text
Business facts: source transaction/outbox → NATS → Analytics projections/views
Operations:     source/relay/projector OTel → existing collector → OpenObserve
```

Message identity and propagated trace context connect processing to its business
event. OpenObserve currently receives operational telemetry, not a second copy
of the canonical business envelopes. Retries and replays can produce additional
spans; span counts are not unique business totals. Do not dump business payloads
into logs. If OpenObserve is later chosen as an analytical destination, give it
an explicit consumer/adapter of the existing feed with defined access, retention
and duplicate handling; keep the source publication unchanged.

## Facts and state

| Input | Storage rule | Meaning |
| --- | --- | --- |
| Business event | Preserve its envelope once per `(source,id)` | One occurrence with its original context. |
| Resource snapshot | Keep the highest resource revision | Latest observed exported state. |

Identity produces seven facts: principal registered, account created, membership
created, credential added, credential removed, session established and session
revoked. Each contract contains its own schema, builder and validator, following
the existing snapshots. Source services contain outbox SQL directly in the
business transaction.

`principal_id` references the existing principal. Account creation records its
creator; memberships, credentials and sessions reference their principal.
There is no generic operation grouping ID. Entity references permit lifecycle
joins without proving a shared operation or cause. Creation facts do not repeat
constant initial revisions; snapshots retain resource versions. Affected IDs live
in `data`, without a duplicate envelope `subject`. Tracing uses transport headers.

Source mutation time is captured in PostgreSQL after the relevant lock and saved
in the event. Retries preserve that time and event ID. Ingestion time is separate
operational metadata. Replaying the same valid facts and resource revisions
produces the same business results independently of the destination tool.

## Versions and readers

The [V1 projector](../domains/analytics/projector/src/identity-v1.mjs)
follows the historical Plans projector: validate schema and subject, execute
native SQL in a transaction, commit, then acknowledge. Durable subscriptions
select supported V1 subjects. V1 and V2 producers and consumers coexist during
migration; unsupported versions do not enter V1 projections or reporting views.

Analytics stores occurrences separately from current Accounts and Memberships.
Versioned `reporting.*_v1` SQL views are its reader interface. Readers use the
separately granted `analytics_reader` role.

The facts support observed registration, account/membership creation, credential
lifecycle and session establishment/revocation. They do not identify which session
accompanied signup or which revocations accompanied a credential removal.
Timestamps and shared principal IDs do not prove causality. Current-state joins provide current
context, not historical roles or names.

Separate operations support defined Identity lifecycle cohort measures, such as
recorded registration to first recorded account creation. Same-operation facts
are co-effects, not independent conversion stages. Additional engagement,
conversion and experiment questions require the corresponding activity, attempts,
eligibility, assignment, actual exposure and outcomes from the domain or
application owning that behavior. An Identity signup experiment can use existing
registration outcomes once its experimental population and exposure are defined;
it does not require an unrelated Product domain.

## Copyable implementation boundaries

- Producer: [Identity account creation](../domains/identity/api/src/services/accounts/create.mjs)
  writes state, revisioned snapshots and distinct occurrences in one transaction;
  its [contracts](../domains/identity/contracts/src/messages) define their meaning.
- Consumer: [Analytics Identity V1 projector](../domains/analytics/projector/src/identity-v1.mjs)
  validates the supported contract and subject, applies idempotent native SQL,
  commits, then acknowledges. Its [migration](../domains/analytics/migrations/sql/V001__init.sql)
  defines the stored grain and versioned reader views.

Follow the [domain processing contract](domains.md) when adding another source.
Reuse the relay, broker and telemetry collector. Add facts for real operations
and projections for real questions; destination tools remain consumer choices.

## Limits

Delivery is at least once, with idempotent database effects. Resource versions
handle reordered snapshots; occurrence history is deduplicated by event identity.
The Identity occurrence stream keeps a rolling history within 400 MiB, evicting
the oldest messages when full, even if a consumer has not read them. Eviction
does not delete facts already stored in Analytics. Recovery from the broker is
limited to the messages it still holds. Local databases are
ephemeral; a fresh Analytics database uses fresh durable names to read retained
messages. No reseed, rebuild or backup tooling is included.

Contract distribution remains manual. See the [deployed validation report](analytics-validation.md)
for exercised endpoints, source-to-sink checks and analytical limitations.

## Sources and applicable conventions

- [CloudEvents](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md): envelope identity, type, subject and time; business payloads remain domain-owned.
- [OpenID CAEP](https://openid.net/specs/openid-caep-1_0-final.html): established/revoked session semantics. These local CloudEvents do not implement CAEP's SET/SSF protocol.
- [Uber instrumentation](https://www.uber.com/us/en/blog/how-uber-standardized-mobile-analytics/): define exact emission rules beyond a valid JSON shape.
- [LinkedIn log architecture](https://www.linkedin.com/blog/engineering/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying) and [Spotify event delivery](https://engineering.atspotify.com/2019/11/spotifys-event-delivery-life-in-the-cloud): separate durable inputs from destination-specific storage and processing.
- [Kimball grain](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/grain/) and [Airbnb Minerva](https://medium.com/airbnb-engineering/how-airbnb-achieved-metric-consistency-at-scale-f23cc53dea70): preserve atomic facts and define metrics consistently across tools.
