# Telemetry simplification audit

Implementation note, 6 November 2026: OpenObserve remains in the original
directory layout. Its existing OTLP exporter already supplies the backend
boundary; the attempted manifest-profile move was reverted. Runtime changes are
limited to native API/UI metric export, a stable relay `publish` span name and
three standard trace-URL query/fragment rules. Logs bypass this transform;
the broad log-body rewriting policy was removed. No custom application functions,
sampling percentages, alert thresholds or business KPIs were introduced.

Local deployment cycles passed 46 signed workflow checks and three browser
tests. Actual OpenObserve queries verified custom spans, attributes, raw and
structured logs, gauge/counter/histogram metrics, trace correlation and pod
identity. Synthetic query canaries are removed from traces; log content is
preserved and remains the producer's responsibility. During a short backend outage,
application/UI requests succeeded and queued telemetry arrived after recovery.
This does not establish durable delivery through Collector/node loss.

Dashboard follow-up corrected the three ingress queries to use Traefik 3.7.13's
standard HTTP duration/count series. They filter to the Traefik producer and
group by host/status rather than the unavailable destination-service labels.
All three queries returned finite values in local OpenObserve; the existing
live panels were updated, preserving unrelated panels and settings. No alert
thresholds were introduced.

Reviewed 6 November 2026. Scope: Traefik, workload traces/spans and metrics,
container logs, Kubernetes/node metrics, collection, storage and backend
replaceability. Three agents completed research/check/refinement loops, followed
by a synthesis and an installed-SDK sampling probe. No application or deployment
changes were made. No managed account was created or real telemetry exported.

## Recommendation

Keep OpenTelemetry instrumentation and the stable internal OTLP collection
endpoint. Keep the node-agent and gateway roles initially. Make the backend an
explicit deployment choice:

- Local development: existing single-node OpenObserve is a reasonable small
  backend.
- Production, if minimizing operations is the priority: evaluate a managed EU
  OTLP backend. This removes our backend storage, upgrades and recovery work.
- Production, if self-hosting is intentional: keep OpenObserve with explicit
  capacity, retention and availability limits; do not replace it with a larger
  self-hosted stack merely to simplify.

The existing topology has justified responsibilities. The largest current
problems are incomplete operational coverage, privacy/cardinality policy and
backend operating responsibilities, rather than an unnecessary gateway pod.

## Observability in plain language

| Concept | Question it helps answer | Example |
| --- | --- | --- |
| Metric | Is behavior getting worse across requests or machines? | Request rate, latency histogram, failed requests, node memory pressure. |
| Trace | Where did this particular journey spend its time? | Traefik -> UI -> API -> PostgreSQL. |
| Span | What happened during one operation within that trace? | A database query or message publication. |
| Log | What selected diagnostic detail helps explain it? | A structured database-connection failure with trace context. |

Spans are the records making up traces, not an additional signal to buy a
separate storage system for. Metrics, traces and logs complement each other;
collecting all possible data is not the objective.

Start with request traffic, errors, latency and resource saturation. Alert on
actionable user impact or impending failure, rather than every unusual value.
Expected authentication rejections such as 401/422 should not automatically
page the operator. [Google SRE monitoring guidance](https://sre.google/sre-book/monitoring-distributed-systems/)

Operational telemetry is separate from committed business events. Trace sampling
must not decide whether a credential-added or account-created fact is emitted.
Analytics remains a contract-validation consumer, not the observability backend.

## What runs today

```text
Application and Traefik OTLP --------------------+
                                                v
Node agents -- logs and node/pod metrics --> gateway --> OpenObserve
                                                ^
                                    cluster-state collection
```

Both collection roles use the same pinned upstream Kubernetes Collector image,
version 0.164.0. They are not two different observability products.

| Component | Responsibility | Why its placement matters |
| --- | --- | --- |
| Collector DaemonSet: one agent per node | Read local container logs and kubelet statistics; attach workload identity. | A central process cannot read every node's local log files without another transport/agent. |
| Collector gateway Deployment | Receive OTLP, enrich, batch, collect cluster-wide state and export with backend credentials. | Gives workloads one internal endpoint and keeps backend policy/credentials centralized. |
| OpenObserve StatefulSet | Store, search and display telemetry. | Owns retention, storage capacity, upgrades and recovery. |

The gateway's cluster receiver reports Kubernetes object state; the agent's
kubelet receiver reports resource usage. These are complementary data sources.
[OpenTelemetry Kubernetes components](https://opentelemetry.io/docs/platforms/kubernetes/collector/components/)

Configured memory requests are 64MiB per agent, 128MiB for the gateway and 1GiB
for OpenObserve. These are scheduler reservations, not measured usage or a
capacity benchmark. OpenObserve additionally needs persistent storage and backend
operations. Sources: [agent](../systems/platform/infra/observability/base/agent-daemonset.yaml),
[gateway](../systems/platform/infra/observability/base/collector-deployment.yaml),
[backend](../systems/platform/infra/observability/base/openobserve-statefulset.yaml).

## Alternatives challenged

| Option | Signal coverage and consequences | Assessment |
| --- | --- | --- |
| Current agents + gateway + OpenObserve | Covers required sources; we operate the backend. | Reasonable self-hosted baseline. |
| Agents + gateway + managed OTLP backend | Same collection boundary; provider operates storage/query infrastructure. | Clearest reduction in our operational responsibilities. |
| Agent-only Collector DaemonSet | Can combine node collection, OTLP and elected cluster collection. | Valid configuration, but not a clear simplicity win. |
| Direct app/Traefik export plus node collectors | Still needs node collection and unique cluster collection; backend settings/credentials spread. | Possible, little benefit for this setup. |
| No collectors/agents | App export does not collect node files, kubelet metrics or cluster state. | Incomplete unless another agent/provider takes over. |
| Replace OpenObserve with another self-hosted distributed stack | Often adds multiple signal stores, coordination and storage dependencies. | No demonstrated simplification. |

The agent-only candidate validates with the exact pinned image. However, removing
one gateway pod adds backend secrets on every agent, OTLP ports and routing,
Lease/cluster RBAC, and an alpha leader-elector dependency in that version.
Node-filtered metadata lookup also requires node-local routing or explicit
producer identity. Local routing can drop traffic when no local agent is ready.
This was not tested in a live multi-node cluster.
[Pinned leader elector](https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.159.0/extension/k8sleaderelector/README.md),
[Kubernetes local traffic semantics](https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/)

Do not optimize only for pod count. A responsibility hidden inside a vendor
agent or moved into every workload has not disappeared.

## Concrete changes worth considering first

1. **Minimize sensitive telemetry.** Previous actual-app probing confirmed query
   values in Fastify span URL attributes. Keep bound PG parameter capture and
   request-body/header capture disabled. Keep the three standard trace-URL rules;
   Traefik already suppresses access-log queries, and custom log producers own
   their content. Avoid speculative JSON-body rewriting. Retain raw telemetry in
   the approved region with explicit access and retention.
   [OTel sensitive-data guidance](https://opentelemetry.io/docs/security/handling-sensitive-data/)
2. **Use stable span names.** The relay names spans `publish ${entry.subject}`;
   snapshot subjects contain resource UUIDs. Prefer a fixed operation name such
   as `publish`, retaining the actual destination as a diagnostic attribute.
   Unique identifiers in operation names create unbounded grouping and can make
   derived span metrics expensive. Do not promote account/user/message IDs into
   routine metric labels. [Low-cardinality span conventions](https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/)
3. **Enable useful built-in application metrics selectively.** Workload overlays
   explicitly set `OTEL_METRICS_EXPORTER=none`. Installed HTTP instrumentation
   already creates request-duration histograms. An exporter/configuration change
   should be investigated before adding custom request-counter functions.
   Traefik covers public ingress; application metrics also expose internal
   requests. Pod CPU/memory metrics are not application request metrics.
4. **Define sampling across the request path.** Current default policy is broadly
   always-on/parent-based. An installed-SDK probe confirmed that a zero root ratio
   still records children of sampled incoming parents. Lowering only the Node
   root ratio does not override a sampled Traefik parent. Configure ingress and
   application roots deliberately. Head sampling cannot promise to retain every
   error trace; tail sampling is an additional stateful/routing responsibility
   to add only when justified. [Traefik sampling](https://doc.traefik.io/traefik/observability/tracing/overview/),
   [OTel sampler specification](https://opentelemetry.io/docs/specs/otel/trace/sdk/)
5. **Keep one log ingestion path.** Pino SDK log sending is currently disabled
   while the node agent reads stdout. Preserve that intentional single path
   unless deliberately changing collection. Actual Fastify probing showed a
   request SERVER span and a child handler INTERNAL span, not duplicate copies.
6. **Identify telemetry consistently.** Use service, version, environment, cluster
   and approved regional metadata. Preserve pod identity through collection.
   These belong in resource/deployment configuration, not business helpers.
7. **Monitor delivery and choose loss tolerance.** File-storage checkpoints are
   log offsets, not a durable exporter queue. Queues are bounded; backend outages
   and process restarts can lose telemetry. Add persistent queues only when the
   required loss tolerance justifies their storage/operations. Surface refused,
   dropped, queued and export-failed telemetry. [Collector resiliency](https://opentelemetry.io/docs/collector/resiliency/)

The existing dashboard has five panels: Traefik rate, 4xx/5xx, p95 latency,
deployment CPU and deployment memory. Its RED starting point is useful. The
first additions should answer whether workloads are ready/restarting, the
database is under pressure, messages are delayed, and telemetry is being lost.
Do not turn every collected series into a dashboard or alert.

## Backend choices and what portability means

OpenObserve is already isolated behind `otlp_http/backend` in
[collector-config.yaml](../systems/platform/infra/observability/base/collector-config.yaml).
Its URL and Basic authorization are deployment settings. Business services do
not know about its storage or query engine.

| Choice | Fit |
| --- | --- |
| Single-node OpenObserve | Small self-hosted backend; storage, security, retention and recovery remain ours. |
| Managed EU Grafana Cloud | Native OTLP/HTTP for all three signals; validate metric mapping and required product features. |
| Managed EU SigNoz Cloud | OTLP with documented regional endpoints and ingestion-key authentication; validate desired Kubernetes/APM experience. |
| Self-hosted SigNoz or Grafana multi-store stack | More backend components; no reason to adopt solely to reduce this stack. |

Both managed candidates accept standard OTLP without replacing application SDKs.
They have different authentication/configuration details. No provider is selected
and no monthly total is inferred from a starting price: first measure ingestion,
metric cardinality, retention and expected feature charges.
[Grafana native OTLP](https://grafana.com/docs/grafana-cloud/send-data/otlp/send-data-otlp/),
[Grafana regions](https://grafana.com/docs/grafana-cloud/platform/security-and-account-management/account-management/regional-availability/),
[SigNoz ingestion](https://signoz.io/docs/ingestion/signoz-cloud/overview/)

OpenObserve HA is a different topology involving object storage, metadata and
coordination services and separately scalable roles. Increasing its single-node
replica count is not an HA conversion. Do not build that topology merely because
the application becomes production.
[OpenObserve architecture](https://openobserve.ai/docs/architecture/)

Backend replacement preserves producer instrumentation, but not automatically:

- Dashboard JSON, alert definitions and log/trace query syntax.
- Metric normalization, resource-label promotion, histogram/rate queries.
- Vendor-specific Kubernetes/APM features.
- Historical data; an endpoint change sends new data, not old history.

For example, Grafana documents limitations in its native OTel Kubernetes
integration, including Kubernetes Monitoring alerts not yet supported through
that collection method. Generic ingestion is not full product-feature parity.
[Grafana native Kubernetes receiver support](https://grafana.com/docs/grafana-cloud/observe-and-act/monitor-infrastructure/kubernetes-monitoring/configuration/config-other-methods/otel-collector-receivers/)

The current OpenObserve dashboard uses PromQL but also vendor panel/stream
metadata. Reuse query intent and validate actual names/labels, rather than
promising the exported dashboard file imports unchanged. Keeping old history
read-only until retention expires may be simpler than migrating it.

## Scaling without redesigning everything

Keep node collection per node. OTLP forwarding can scale independently, but the
current gateway also contains `k8s_cluster`: simply increasing gateway replicas
would create multiple cluster-state collectors. When forwarding capacity needs
replicas, separate that singleton responsibility or prove supported leader
election. Do not add the machinery before measurements justify it.

Metric cost grows with label combinations; trace/log cost grows with retained
volume and retention. Keep operation names/metric labels bounded, choose trace
sampling deliberately, and avoid excessive logs. Managed storage does not make
unbounded telemetry inexpensive. Keep backend and collection credentials/policy
at a narrow boundary rather than distributing them into every app.

## Experiments and limitations

- Pinned Collector 0.159.0 validated baseline and leader-elected/agent-only
  candidates using synthetic service-account files. No live election or
  node-local routing was exercised.
- Actual Fastify instrumentation emitted two legitimate parent/child spans.
- Installed JS sampling probe verified root versus remote-parent decisions.
- The pinned Collector accepted three synthetic OTLP inputs and emitted nine
  nonempty protobuf requests to three mock endpoint/auth profiles: OpenObserve,
  Grafana and SigNoz shapes. Inputs were unchanged; only exporter configuration
  selected the destination. This proves the wire/configuration boundary, not
  real-provider storage, dashboards, billing or histogram behavior.
- No production throughput, backend outage, failover, real provider account,
  monthly bill or managed Kubernetes feature parity was tested. Temporary
  containers and networks were removed. No secrets were decrypted or displayed.

## Small next-step proposal

Keep the current collection topology. First fix URL minimization and relay span
names, define resource identity/sampling, and validate selected built-in HTTP
metrics. Establish a small actionable dashboard/alert set and telemetry-volume
baseline. Then compare a managed EU backend against consciously self-hosting
OpenObserve using real measured needs and a cost estimate.

For a backend trial, verify a cross-service trace, correlated log, Traefik
counter/histogram, node/pod metric and cluster readiness/restart metric. Check
resource identity, privacy, rate/p95 queries and bounded outage behavior. A short
dual export is possible when permitted and affordable; it duplicates ingestion.
Leave business services and event contracts unchanged. No universal backend
adapter, new business-function helpers, tail-sampling tier or observability
operator is required by this recommendation.
