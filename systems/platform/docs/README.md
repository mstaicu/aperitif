# Platform

Platform supplies shared infrastructure and the outbox relay executable. Each publishing domain owns its relay deployment, streams, and message contracts.

## Rules

- The relay removes a committed outbox row only after JetStream acknowledges publication. A retry can redeliver it. Consumers handle duplicates.
- A failed delivery logs the row ID, subject, and underlying error. Kubernetes retries by restarting the relay with backoff. Use `kubectl logs -n identity deployment/outbox-relay --previous` to inspect the failure.
- The domain chooses stream retention and replication. Identity requests three stream replicas. Production NATS schedules its three pods on distinct nodes.
- Install NATS for message delivery and Traefik for routed traffic. An isolated browser test can use port forwarding.
- The telemetry agent reads node-local logs and kubelet metrics. The gateway receives application telemetry and collects cluster-wide state.
- The Collector and OpenObserve share the `otel` namespace. Applications send telemetry to `otel-collector.otel`. Each installation configures the gateway's export destination and credentials.

## Examples

| When | Expected result |
| --- | --- |
| Publication succeeds but the relay exits before committing the deletion | The row remains eligible for retry with the same message ID. |
| Another transaction holds every pending row | The relay skips locked rows and polls again in one second. |
| A developer exercises Identity through a forwarded UI port | The test can run with Postgres, the API, and the UI. |

To start OpenObserve or the Collector locally, run these commands from that component's `kustomize/overlays/local/` directory.

```sh
kubectl apply -f namespace.yaml
kubectl apply -k .
```

For the full stack, run the same commands in both directories. The namespace is applied separately so `kubectl delete -k .` removes only the selected component. Deleting the shared namespace removes both components and their namespaced storage claims.

## References

- [Relay implementation](../outbox-relay/src/relay.mjs) · [Identity stream configuration](../../identity/outbox-relay/kustomize/base/streams.json) · [Broker placement](../nats/kustomize/overlays/production/statefulset.yaml)
- [Traefik](../traefik/kustomize/) · [Node agent](../otel-collector/kustomize/base/agent-config.yaml) · [Gateway](../otel-collector/kustomize/base/collector-config.yaml) · [OpenObserve dashboard](../openobserve/operations-dashboard.json)
- From the repository root, `make -C systems/platform check` renders all shared overlays. [Platform Makefile](../Makefile)
