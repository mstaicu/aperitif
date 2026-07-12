# Observability

OpenTelemetry Collector infrastructure.

## Owns

- collector deployment and service
- collector agent
- telemetry network policy
- environment-specific exporter configuration

Workloads emit telemetry only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.

## Operations

```sh
make -C platform/observability deploy
```

## Checks

```sh
kubectl kustomize platform/observability/overlays/ephemeral
kubectl kustomize platform/observability/overlays/prod-eu
```
