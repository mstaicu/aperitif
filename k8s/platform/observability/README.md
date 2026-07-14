# Observability

This unit provides OpenTelemetry collection inside the cluster.

- `otel-agent` collects node, pod, and container metrics from each node.
- `otel-collector` receives OTLP traces, metrics, and explicitly emitted logs.
- The current collector writes telemetry to its debug exporter only.

The agent does not scrape container log files. There is no durable telemetry
backend yet. Applications emit OTLP only when `OTEL_EXPORTER_OTLP_ENDPOINT` is
set.

Deploy locally with:

```sh
make -C platform/observability deploy
```

Render manifests with:

```sh
kubectl kustomize platform/observability/overlays/ephemeral >/dev/null
kubectl kustomize platform/observability/overlays/prod-eu >/dev/null
```
