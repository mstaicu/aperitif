# Observability

This unit is the product-agnostic OpenTelemetry boundary.

```text
applications --OTLP--> collector Service --> collector --> OpenObserve
nodes --logs and metrics------------------> agent -----> collector
Kubernetes API --workload state-----------> collector
```

| Component | Responsibility |
| --- | --- |
| `collector` | One cluster gateway Deployment for OTLP signals and Kubernetes workload state |
| `agent` | One DaemonSet pod per node for container logs and kubelet metrics |
| Overlay | Complete backend configuration, endpoint, and encrypted credentials |

The Collector receives traces, metrics, and explicitly emitted logs. It reports
desired and available replicas plus container restarts from the Kubernetes API.
Keep it at one replica while it owns this cluster-wide receiver.

Every 30 seconds the Agent reads node/pod/container CPU, memory, filesystem, and
network metrics, plus volume capacity and usage, from the kubelet. It reads
container stdout and stderr once from the node log directory. Memory-limit
utilization exists only when every container in a pod declares a memory limit.

Both use the official Kubernetes Collector distribution pinned by version and
digest. They run non-root with explicit resource limits, probes, memory limiting,
least-privilege kubelet access, and generated ConfigMap names that roll pods when
configuration changes. They attach namespace, pod, node, workload, container, and
image identity; agent telemetry retains the original workload identity.

The OTLP NetworkPolicy accepts every cluster namespace, so a new product does not
need to modify this platform unit. Applications know only
`otel-collector.otel.svc.cluster.local`; an overlay can change the backend without
changing producers.

Current overlays use OpenObserve. Production currently has a single local-mode
instance with a 10 GiB PVC and seven-day retention; it is not highly available.
Traefik owns HTTP access trails. Fastify keeps startup, shutdown, and explicit
problem-details logs without logging every request. The Agent excludes the `otel`
namespace to prevent the backend from ingesting its own access logs.

```sh
make -C platform/cluster/observability deploy
```

After ingress and observability are deployed locally, open
`https://observe.tma.com`.

```sh
kustomize build --enable-alpha-plugins --enable-exec \
  platform/cluster/observability/overlays/ephemeral >/dev/null
kubectl kustomize platform/cluster/observability/overlays/prod-eu >/dev/null
make -C platform/cluster/observability check
```
