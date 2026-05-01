# Observability Platform

Observability contains OpenTelemetry Collector manifests, but it is not currently part of the active local or prod-eu composition.

Do not assume OTel exists in an environment unless this platform unit is explicitly composed.

## Intended Boundary

Observability should own cross-cutting telemetry infrastructure:

- OpenTelemetry Collector deployment,
- collector service and namespace,
- telemetry network policy,
- environment-specific exporter configuration.

It should not own domain instrumentation code. Domain APIs and workers decide whether they register real telemetry or no-op behavior based on runtime configuration.

## Current State

```text
platform/observability/base
platform/observability/overlays/dev
platform/observability/overlays/live
```

The folder is kept as a future platform unit, not as an active dependency.

## Enabling Later

Before enabling observability:

- decide local vs live exporter behavior,
- make API/worker OTel registration conditional on configuration,
- add the platform unit to Make/Skaffold only when local dev needs it,
- add Flux Kustomizations under `clusters/<env>/platform`,
- update network policies only for workloads that actually emit telemetry.

## Checks

```sh
kubectl kustomize platform/observability/overlays/dev
kubectl kustomize platform/observability/overlays/live
```
