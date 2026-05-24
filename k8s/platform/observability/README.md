# Observability Platform

Observability owns OpenTelemetry Collector infrastructure.

## Owns

- collector deployment and service
- namespace
- telemetry network policy
- environment-specific exporter configuration

Domain units decide whether to emit telemetry from runtime configuration.

## Operations

```sh
make deploy-observability
```

Workloads register real OTel only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
Otherwise OTel is no-op.

## Checks

```sh
kubectl kustomize platform/observability/overlays/dev
kubectl kustomize platform/observability/overlays/live
```
