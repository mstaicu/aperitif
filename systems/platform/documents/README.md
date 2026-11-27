# Platform

Platform supplies shared infrastructure and the outbox relay executable. Each publishing domain owns its relay deployment, streams, and message contracts.

## Rules

- The relay removes a committed outbox row only after JetStream acknowledges publication. A retry can redeliver it. Consumers handle duplicates.
- A failed delivery logs the row ID, subject, and underlying error. Kubernetes retries by restarting the relay with backoff. Use `kubectl logs -n identity deployment/outbox-relay --previous` to inspect the failure.
- The domain chooses stream retention and replication. Identity requests three stream replicas. Production NATS schedules its three pods on distinct nodes.
- Install the event bus for message delivery, ingress for routed traffic, and observability for telemetry. An isolated browser test can use port forwarding.
- The telemetry agent reads node-local logs and kubelet metrics. The gateway receives application telemetry and collects cluster-wide state.

## Examples

| When | Expected result |
| --- | --- |
| Publication succeeds but the relay exits before committing the deletion | The row remains eligible for retry with the same message ID. |
| Another transaction holds every pending row | The relay skips locked rows and polls again in one second. |
| A developer exercises Identity through a forwarded UI port | The test can run with Postgres, the API, and the UI. |

## References

- [Relay implementation](../outbox-relay/src/relay.mjs) · [Identity stream configuration](../../identity/infra/outbox-relay/base/streams.json) · [Broker placement](../infra/event-bus/overlays/production/statefulset.yaml)
- [Ingress](../infra/ingress/) · [Node agent](../infra/observability/base/agent-config.yaml) · [Gateway](../infra/observability/base/collector-config.yaml)
- From the repository root, `make -C systems/platform check` renders all shared overlays. [Platform Makefile](../Makefile)
