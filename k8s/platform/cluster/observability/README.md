# Observability

This platform unit is the product-agnostic OpenTelemetry boundary.

```text
applications --OTLP--> otel-collector Service --> collector --> OpenObserve
nodes --metrics/logs---------------------> agent --> collector
Kubernetes API --workload state/restarts-----------> collector
```

- `collector` is one cluster gateway Deployment for OTLP traces, metrics, and
  explicitly emitted logs. It also reports desired and available workload
  replicas and container restarts from the Kubernetes API. Keep it at one
  replica while it owns this cluster-wide receiver. Each environment overlay
  owns its complete Collector configuration and selected backend.
- `agent` is one DaemonSet pod per node. Every 30 seconds it collects
  CPU, memory, filesystem, and network metrics for that node's pods and
  containers, plus volume capacity and usage, from the kubelet. It also reads
  container stdout and stderr once from the node's pod log directory. Pod
  memory-limit utilization is emitted only when every container in that pod
  declares a memory limit.
- Both use the official Kubernetes Collector distribution, pinned by version
  and digest.
- Memory limits, the Collector memory limiter, health probes, non-root
  execution, and least-privilege kubelet access are explicit.
- Generated ConfigMap names change with the configuration, causing Kubernetes
  to roll the affected pods instead of leaving stale configuration mounted.
- Both Collectors attach namespace, pod, node, workload, container, and image
  identity. Agent telemetry keeps the identity of the original workload when
  it is forwarded through the gateway.
- The internal OTLP ports accept telemetry from every cluster namespace, so
  adding a product does not require changing this platform unit.
- Both current overlays select `openobserve` as the backend. Its complete
  manifests live in each overlay rather than the reusable OpenTelemetry base.
  The production instance uses a 10 GiB PVC and seven-day retention. This
  deliberately small local-mode deployment is not highly available.

Traefik owns the HTTP access trail. Fastify keeps its logger for startup,
shutdown, and explicit problem-details failures without automatically logging
every request. Owned JSON logs are parsed by the agent without sending logs
directly from applications. The agent excludes the complete `otel` namespace
from file logging, preventing the selected backend from ingesting its own
ingestion access logs.

The Collector exports every signal through the overlay's `otlphttp/backend`
exporter. Endpoint and credentials live in that environment overlay, with
credentials in a SOPS-encrypted Secret. Applications know only
`otel-collector.otel.svc.cluster.local`, so one environment can replace its
backend without changing any producer.

Deploy locally with:

```sh
make -C platform/cluster/observability deploy
```

Open the local UI at `https://observe.tma.com` after deploying ingress and this
unit.

Render both environments with:

```sh
kustomize build --enable-alpha-plugins --enable-exec \
  platform/cluster/observability/overlays/ephemeral >/dev/null
kubectl kustomize platform/cluster/observability/overlays/prod-eu >/dev/null
```

Validate the production manifests with:

```sh
make -C platform/cluster/observability check
```
