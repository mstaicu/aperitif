# Analytics as a domain

Status: Proposed. No Analytics implementation exists. Add it when a concrete
reporting or modelling use case needs it.

The [minimal topology and evolution plan](analytics-evolution.md) records
production lessons, staged infrastructure and event coverage, proposed field
additions, and a small framework for trustworthy metrics.

Analytics can be an independently owned domain that consumes other domains'
public data contracts and produces datasets, reports and model results. Its
boundary is a cohesive capability, not automatically the entire data department.
Separate capabilities can become separate domains when their ownership and
lifecycle require it.

## Ownership

Analytics may own:

- Ingestion workers/projectors and their consumer positions.
- Warehouse or lake datasets, schemas and transformations.
- Model training, model artefacts and model-serving services.
- APIs, dashboards and UIs for its consumers.
- Deployment configuration, data quality, freshness, monitoring and recovery.

These components can be managed services or workloads deployed by the team,
just as Identity can use managed PostgreSQL. Ownership means maintaining the
data flow, contracts and outputs; it does not require hosting every dependency
or running everything in one process or cluster. A managed warehouse or BI tool
can be part of this owned capability.

Source domains remain authoritative for their business facts. Identity owns
accounts and memberships; Analytics owns its derived datasets and models.
Analytics consumes supported interfaces rather than reading another domain's
database. Shared infrastructure remains in the platform.

## Data flow

```text
Source domain: business transaction + outbox
  -> existing generic relay
  -> JetStream stream
  -> Analytics ingestion consumer/projector
  -> owned warehouse/lake datasets
  -> reports, models, APIs and UIs
```

Each independent ingestion pipeline that needs resumable progress gets its own
durable pull consumer, filtered to the subjects it needs. Its replicas share that
consumer. Its acknowledgement position is independent of application projectors.
An ingestion worker handles duplicate delivery and acknowledges only after a
durable sink commit, using the destination's transaction or idempotent commit
mechanism. Model training normally runs against the stored dataset rather than
holding broker deliveries open for the duration of training.

Choose the input according to the dataset:

- Snapshots maintain current state using resource versions. They omit
  intermediate transitions; a fresh scan can use an ephemeral consumer, as in
  the messaging reference.
- Distinct events/deltas supply history within the stream's retention limits.
  Producers must preserve each required event in the outbox. Another stream
  cannot recover snapshots already coalesced by the producer.
- Command results belong in published facts when analytics needs them. A
  WorkQueue command stream removes acknowledged commands and is not an event
  history.

The relay remains payload-agnostic. Producers and consumers define any required
per-resource sequencing protocol; the relay does not guarantee source order.
A durable cursor cannot recover expired or removed messages. Keep the datasets
needed for reproducible historical analysis in Analytics-owned storage.

If Analytics publishes model results or other business messages, it can use its
own outbox and the same relay. Its team can deploy its components independently
while honoring upstream contracts and maintaining its own supported interfaces.

## Start with the required workloads

An illustrative layout is:

```text
domains/analytics/
  workloads/
    ingestion/       consumers/projectors
    migrations/      owned storage schema, when needed
    models/          training or serving, when needed
    api/             reports or model results, when needed
    ui/              dashboards, when needed
```

Start with ingestion and the storage needed by the first use case. Use an
existing query or BI interface when it suffices. Add a custom API, UI or model
service only when required. Managed dependencies need no placeholder container.
This proposal does not require adopting a full data mesh or adding a new shared
framework.

See the [messaging reference](../examples/messaging.md) for stream and
producer/consumer patterns. The established
[data-product architecture](https://martinfowler.com/articles/data-mesh-principles.html)
groups pipeline code, interfaces, data and infrastructure under ownership.
[Uber's ingestion platform](https://www.uber.com/qa/en/blog/from-batch-to-streaming-accelerating-data-freshness-in-ubers-data-lake/)
is a production example of owned ingestion into a lake for analytics and ML;
it uses different transport and processing tools from this repository.
