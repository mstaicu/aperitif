# Analytics as a domain

Status: The baseline is implemented in
[`systems/analytics`](../../systems/analytics/README.md). Additional tools and
capabilities remain proposals.

Use the existing implementation and canonical rules:

- [Analytics foundation](../analytics.md): facts, current state, ownership and analytical limits.
- [Domain communication](../domains.md#asynchronous): message terminology and versioned contracts.
- [Analytics domain](../../systems/analytics/README.md): local operation, durable consumers and SQL readers.
- [Deployed validation](../analytics-validation.md): exercised endpoints and source-to-sink observations.

Analytics owns its projectors, derived datasets and reader interfaces. Source
domains remain authoritative for business facts; Analytics uses their public
contracts rather than reading their databases. Managed storage and deployed
workloads can serve the same boundary.

## Extend for a concrete capability

Add only the component needed by the next question:

- A warehouse or lake destination for a demonstrated storage/query requirement.
- A BI interface when existing SQL access is insufficient.
- Model training or serving for a defined model workload.
- An API or UI for a supported consumer workflow.
- Analytics-addressed commands and owned job state when asynchronous analytical
  work requires execution. Other domains' command queues are not an analytics
  archive; consume their published result facts.

Training and long-running work use stored datasets rather than holding broker
messages open. If Analytics publishes results, use its own business transaction
and outbox with the existing relay. A managed dependency needs no placeholder
container, and this does not require a data mesh or shared framework.

The [evolution plan](analytics-evolution.md) records research and proposed event
coverage. The [capability assembly map](analytics-platform.md) separates optional
analytics, experimentation, models and agent workflows by owner and prerequisite.
The [local proposal](analytics-local.md) discusses future managed/self-hosted
components; it does not replace the implemented workload manifests.

[Data-product ownership](https://martinfowler.com/articles/data-mesh-principles.html)
and [Uber's ingestion experience](https://www.uber.com/qa/en/blog/from-batch-to-streaming-accelerating-data-freshness-in-ubers-data-lake/)
provide design precedents, not a requirement to copy their topology or tools.
