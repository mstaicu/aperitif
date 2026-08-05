# SigNoz

This directory contains the self-hosted SigNoz Kubernetes manifests generated
by SigNoz Foundry v0.2.17.

- `casting.yaml` is the small input given to Foundry.
- `casting.yaml.lock` records the configuration resolved by Foundry.
- `crds` contains the required Altinity ClickHouse Operator 0.25.3 CRDs.
- `base` contains the active resources produced by `foundryctl forge`.
- `overlays/ephemeral` owns the disposable local namespace.
- `overlays/prod-eu` owns the prune-protected production namespace.

Validate the render with:

```sh
make -C platform/signoz check
```

The generated files are not active in Flux yet. Before activation, pin the
generated images, replace default credentials, and choose storage and
retention. Regenerate the component manifests from `casting.yaml`; do not
maintain Foundry-owned component manifests by hand.
