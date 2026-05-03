# Observability Platform

Observability contains OpenTelemetry Collector manifests. It is part of the active platform baseline for local and prod-eu composition.

Do not assume OTel exists in an environment unless this platform unit is explicitly composed there.

## Intended Boundary

Observability should own cross-cutting telemetry infrastructure:

- OpenTelemetry Collector deployment,
- collector service and namespace,
- telemetry network policy,
- environment-specific exporter configuration.

It should not own domain instrumentation code. Domain deployable units decide whether they register real telemetry or no-op behavior based on runtime configuration.

## Current State

```text
platform/observability/base
platform/observability/overlays/dev
platform/observability/overlays/live
```

The unit is deployed locally by the main domain/full-stack targets. It can also be deployed directly with:

```sh
make observability
```

Domain workloads register real OTel only when `OTEL_EXPORTER_OTLP_ENDPOINT` is configured. Without that environment variable, workload OTel is a no-op so future overlays can opt out cleanly.

## Enabling In An Environment

Before making observability part of another environment:

- decide local vs live exporter behavior,
- set `OTEL_EXPORTER_OTLP_ENDPOINT` only on workloads that should emit telemetry,
- add Flux Kustomizations under `clusters/<env>/platform`,
- update network policies only for workloads that actually emit telemetry.

## Checks

```sh
kubectl kustomize platform/observability/overlays/dev
kubectl kustomize platform/observability/overlays/live
```
