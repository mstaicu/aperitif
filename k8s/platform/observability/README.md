# Observability

This platform unit is the product-agnostic OpenTelemetry boundary.

```text
applications --OTLP--> otel-collector --OTLP later--> telemetry backend
nodes --metrics/logs--> otel-agent ----OTLP---------> otel-collector
```

- `otel-collector` is one cluster gateway for OTLP traces, metrics, and
  explicitly emitted logs.
- `otel-agent` is one DaemonSet pod per node. Every 30 seconds it collects
  CPU, memory, filesystem, and network metrics for that node's pods and
  containers, plus volume capacity and usage, from the kubelet. It also reads
  container stdout and stderr once from the node's pod log directory.
- Both use the official Kubernetes Collector distribution, pinned by version
  and digest.
- Memory limits, the Collector memory limiter, health probes, non-root
  execution, and least-privilege kubelet access are explicit.
- Generated ConfigMap names change with the configuration, causing Kubernetes
  to roll the affected pods instead of leaving stale configuration mounted.
- The internal OTLP ports accept telemetry from every cluster namespace, so
  adding a product does not require changing this platform unit.

Traefik owns the HTTP access trail. Fastify keeps its logger for startup,
shutdown, and explicit problem-details failures without automatically logging
every request. The agent excludes both Collector containers from file logging
to prevent a telemetry feedback loop.

The current exporter is `debug`, so logs are collected but not retained. Add a
durable backend by replacing the gateway exporter; applications continue
sending to `otel-collector.otel.svc.cluster.local`.

Deploy locally with:

```sh
make -C platform/observability deploy
```

Render both environments with:

```sh
kubectl kustomize platform/observability/overlays/ephemeral >/dev/null
kubectl kustomize platform/observability/overlays/prod-eu >/dev/null
```

Validate the production manifests with:

```sh
make -C platform/observability check
```
