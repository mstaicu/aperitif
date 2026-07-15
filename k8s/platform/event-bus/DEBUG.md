# Debug NATS

Debug from the infrastructure inward:

```text
Kubernetes -> NATS servers -> streams -> consumers -> publishers/projectors
```

The cluster has three servers. JetStream metadata and R3 streams need two
healthy servers for quorum.

## 1. Check Kubernetes

```sh
kubectl get statefulset,pod,pvc,service,poddisruptionbudget -n nats -o wide
kubectl get events -n nats --sort-by=.lastTimestamp
kubectl logs -n nats -l app=nats --prefix --since=10m
```

Healthy means:

- `StatefulSet/nats` is `3/3` Ready;
- all three pods are Running without continuing restarts;
- all three PVCs are Bound;
- `Service/nats-client` has one ready endpoint per pod.

Check endpoints directly:

```sh
kubectl get endpointslice -n nats \
  -l kubernetes.io/service-name=nats-client -o wide
```

## 2. Check one server

```sh
kubectl exec -n nats nats-0 -- \
  nats-server -t -c /etc/nats-config/nats.conf

kubectl exec -n nats nats-0 -- \
  wget -qO- 'http://127.0.0.1:8222/healthz'
```

The config check must pass and health must return `{"status":"ok"}`. Repeat
for `nats-1` or `nats-2` when only one member is unhealthy.

## 3. Connect the NATS CLI

In one terminal:

```sh
kubectl port-forward -n nats service/nats-client 4222:4222
```

In another:

```sh
export NATS_URL=nats://127.0.0.1:4222
```

Use `--no-context` so a saved NATS context cannot redirect the commands.

The current `SYS` credentials are temporary and provide server reports:

```sh
NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server ping 3 --id

NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server report health

NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server report jetstream --leaders
```

Expect three replies, three healthy servers, one metadata leader, and zero
settled replica lag.

Product streams live in the unauthenticated `APP` account, so omit `SYS`
credentials for stream and consumer commands:

```sh
nats --no-context account info
nats --no-context stream report --leaders
nats --no-context stream info ACCOUNTS
nats --no-context consumer report --leaders ACCOUNTS
```

For a consumer, inspect its durable name:

```sh
nats --no-context consumer info \
  ACCOUNTS entitlements-accounts-projection
```

- Growing pending messages means the projector is absent or slow.
- Growing acknowledgement-pending or redeliveries means its handler is
  failing or not acknowledging.
- Missing streams usually means the owning outbox publisher has not started or
  failed during stream creation.

Stop the port-forward with `Ctrl-C` and run `unset NATS_URL` when finished.

## 4. Follow one event

```text
domain transaction -> outbox_events -> publisher -> stream
                   -> consumer -> projector -> projection table
```

```sh
kubectl logs -n accounts deployment/outbox-publisher --since=10m
kubectl logs -n entitlements deployment/outbox-publisher --since=10m
kubectl logs -n entitlements deployment/accounts-projector --since=10m
```

An unpublished outbox row points to the publisher or NATS connection. A stream
message with consumer backlog points to the projector. An acknowledged message
with wrong projected state points to the projection transaction.

## 5. Check capacity

```sh
kubectl exec -n nats nats-0 -- df -h /data
nats --no-context stream state ACCOUNTS
NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server report jetstream
```

Compare stream limits and actual use with the capacity model in
[README.md](README.md). Docker Desktop may report the host filesystem size for
a hostPath PVC; locally, `max_file_store` is the effective ceiling.

## Symptom map

| Symptom | Check first |
| --- | --- |
| Pod Pending | Events, PVC binding, and node count |
| CrashLoopBackOff | Current and `--previous` pod logs |
| Running but not Ready | `/healthz`, routes, and quorum |
| Fewer than three ping replies | Pods, DNS, routes, and NetworkPolicy |
| Publish rejected | Stream `max_bytes`, PVC space, and outbox backlog |
| Consumer pending grows | Owning projector |
| Application cannot connect | Client endpoints and NetworkPolicy selectors |

Do not purge or delete streams, consumers, PVCs, or the `nats` Namespace while
diagnosing. R3 survives one server failure; it is not a backup.
