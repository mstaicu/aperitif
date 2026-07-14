# NATS Debugging

Use this guide to deploy, inspect, and troubleshoot this repository's NATS
JetStream cluster. Capacity sizing is documented in [README.md](README.md).

## Mental model

Debug NATS from the outside in:

```text
Kubernetes -> NATS servers -> JetStream cluster -> streams -> consumers -> components
```

- Kubernetes starts three NATS server pods and mounts one PVC on each pod.
- The three servers connect over NATS routes and form one cluster named `EU`.
- JetStream uses a two-of-three majority for its metadata and R3 streams. One
  server may fail; two server failures remove quorum.
- A stream stores messages. Its replica count decides how many complete copies
  JetStream keeps across the available servers.
- A consumer tracks which stream messages a projector has delivered and
  acknowledged.
- Outbox publishers create their domain streams and publish committed events.
- Projectors create durable consumers and apply upstream events to their
  domain projections.

The server count and a stream's replica count are related but independent. The
StatefulSet provides three storage servers; each stream chooses whether to use
one or three of them.

| Port   | Used by                         | Purpose                                             |
| ------ | ------------------------------- | --------------------------------------------------- |
| `4222` | Applications and the NATS CLI   | Client publish, consume, and administration traffic |
| `6222` | NATS servers only               | Routes between cluster members                      |
| `8222` | Kubernetes probes and operators | HTTP health and monitoring                          |

Applications connect to `nats-srv.nats.svc.cluster.local:4222`. They do not
connect to the headless service or port `6222`.

## Deploy

Render both environments before applying a change:

```sh
kubectl config current-context
kubectl kustomize platform/event-bus/overlays/ephemeral >/dev/null
kubectl kustomize platform/event-bus/overlays/prod-eu >/dev/null
```

Only run the local deployment command when the context is the intended local
cluster.

Deploy locally and wait for all three servers:

```sh
make -C platform/event-bus deploy
kubectl rollout status -n nats statefulset/nats --timeout=20m
```

Production is reconciled by Flux. Check Flux first if the Git change has not
reached the cluster:

```sh
kubectl get kustomization event-bus -n flux-system
kubectl describe kustomization event-bus -n flux-system
```

`Ready=True` means Flux successfully applied the event-bus overlay. It does not
prove that every stream and consumer is healthy; continue with the checks
below.

## Debugging

Start at step 1 and move down. This separates Kubernetes failures from NATS
cluster failures and application failures.

All commands in this section are read-only except the two temporary filesystem
write checks, which immediately remove the files they create.

### 1. Check the Kubernetes objects

```sh
kubectl get statefulset,pod,pvc,service,poddisruptionbudget -n nats -o wide
```

A healthy deployment has:

- `nats` at `3/3` Ready;
- three `1/1 Running` pods with no continuing restart count;
- three `Bound` PVCs of the expected size and storage class;
- `maxUnavailable: 1` and one allowed disruption in the PDB when all pods are
  healthy;
- three distinct production nodes because production requires hostname
  anti-affinity. All three local pods may share the single Docker Desktop node.

The client Service also needs one ready endpoint per pod:

```sh
kubectl get endpointslice -n nats \
  -l kubernetes.io/service-name=nats-srv -o wide
```

No endpoints means the pods are not Ready or the Service selector no longer
matches the pod labels.

### 2. Check events and logs

Events explain scheduling, PVC, mount, image, and probe failures:

```sh
kubectl get events -n nats --sort-by=.lastTimestamp
kubectl describe pod nats-0 -n nats
kubectl describe pvc nats-storage-nats-0 -n nats
```

Read all current server logs, then the previous container log after a restart:

```sh
kubectl logs -n nats -l app=nats --prefix --since=10m
kubectl logs -n nats nats-0 --previous
```

During a clean parallel startup, brief DNS lookup failures, `Waiting for
routing`, and `JetStream has not established contact with a meta leader` are
normal. They are a problem only if they continue after all pods are Ready. The
plaintext-password warning is expected while the intentionally deferred
authentication setup remains in use.

### 3. Check the probes directly

First prove that the live configuration parses, then query a server from inside
its pod:

```sh
kubectl exec -n nats nats-0 -- \
  nats-server -t -c /etc/nats-config/nats.conf

kubectl exec -n nats nats-0 -- \
  wget -qO- 'http://127.0.0.1:8222/healthz'

kubectl exec -n nats nats-0 -- \
  wget -qO- 'http://127.0.0.1:8222/healthz?js-server-only=true'

kubectl exec -n nats nats-0 -- \
  wget -qO- 'http://127.0.0.1:8222/healthz?js-enabled-only=true'
```

Each should return `{"status":"ok"}`.

- `/healthz` is the deep startup check, including JetStream recovery.
- `js-server-only` is readiness: can this server receive client traffic?
- `js-enabled-only` is liveness: is the server alive with JetStream still
  enabled?

Repeat the commands for pods `1` and `2` when diagnosing one unhealthy member.

### 4. Connect with the NATS CLI

Port-forward the client Service in one terminal:

```sh
kubectl port-forward -n nats service/nats-srv 4222:4222
```

In another terminal, point the CLI at that connection:

```sh
nats --version
export NATS_URL=nats://127.0.0.1:4222
```

`SYS` is a NATS system account, not a Kubernetes ServiceAccount. It can request
server-wide monitoring data. The current `sys`/`changeit` credentials are
temporary and must change when NATS authentication is hardened.

The `APP` account owns product streams. An unauthenticated connection currently
maps to its `app` user. Therefore, use inline `SYS` credentials only for server
reports and no credentials for stream and consumer commands.

Use `--no-context` so a previously selected local NATS context cannot silently
change the server or credentials.

Stop the port-forward with `Ctrl-C` and run `unset NATS_URL` when finished.

### 5. Check all servers and quorum with `SYS`

```sh
NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server ping 3 --id

NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server list 3

NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server report health

NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server report jetstream --leaders

NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server report routes
```

Healthy means:

- `server ping` receives exactly three replies;
- all rows use cluster `EU`, the expected NATS version, and `JS=yes`;
- all three health rows are `ok`;
- the JetStream metadata group has exactly one leader;
- the other two metadata peers are current and online with zero lag;
- pending metadata work is zero after the cluster settles.

Do not memorize the route count: NATS route pooling creates multiple route
connections. The important facts are that all three servers see each other,
the cluster has quorum, and the logs are not continuously reconnecting.

`No JetStream asset leader data reported` is normal before any outbox publisher
has created a stream.

### 6. Check the `APP` account

These commands intentionally omit `SYS` credentials:

```sh
nats --no-context account info
nats --no-context stream ls
nats --no-context stream report --leaders
```

`account info` should show:

- user and account `APP`;
- JetStream account information;
- `Stream Requires Max Bytes Set: true`;
- the current stream, consumer, memory, and storage counts.

`No Streams defined` is correct when the outbox publishers are not deployed.
If publishers are running, it normally means stream creation failed; inspect
their logs next.

### 7. Inspect a stream

Use a real stream name such as `ACCOUNTS` or `ENTITLEMENTS`:

```sh
nats --no-context stream info ACCOUNTS
nats --no-context stream state ACCOUNTS
nats --no-context stream report --leaders
```

Check:

- the configured subjects, file storage, `max_bytes`, and replica count;
- one stream leader and all expected replicas online and current;
- messages and bytes below the configured limit;
- first and last sequence numbers moving when events are published;
- no replica lag after the cluster has settled.

`stream state` reports the logical bytes in one stream. For R3, JetStream keeps
one complete copy on each of three servers; do not multiply the stream's
logical bytes when comparing it with one pod's PVC.

Changing a publisher environment variable does not update an already-created
stream. Always query `stream info` to confirm the live configuration.

### 8. Inspect consumers

```sh
nats --no-context consumer ls ACCOUNTS
nats --no-context consumer report --leaders ACCOUNTS
nats --no-context consumer info \
  ACCOUNTS entitlements-accounts-projection
```

Check:

- pending messages: queued but not yet delivered;
- acknowledgement pending: delivered but not yet acknowledged;
- redeliveries: messages retried after failed or missing acknowledgements;
- last delivery and acknowledgement times;
- a current online leader for the durable consumer.

A growing pending count means the projector is absent or slower than the
publisher. Growing acknowledgement-pending or redelivery counts usually mean
the handler is failing, timing out, or not acknowledging messages. Inspect the
owning projector logs and database next.

### 9. Check storage

Check the filesystem independently on every server:

```sh
kubectl exec -n nats nats-0 -- df -h /data
kubectl exec -n nats nats-1 -- df -h /data
kubectl exec -n nats nats-2 -- df -h /data
```

Then compare NATS' view:

```sh
NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server report jetstream

nats --no-context stream report --leaders
```

The PVC filesystem must have free space, each server must remain below the
configured `max_file_store`, and the sum of R3 stream limits must fit below 80%
of one PVC as described in the capacity model. Docker Desktop's `hostpath`
provisioner may make `df` show the host filesystem size rather than the PVC's
requested `1Gi`; locally, the NATS `max_file_store` value is the enforced
server ceiling. A production block volume should report its actual filesystem
size.

When a stream reaches `max_bytes`, its current `DiscardNew` policy rejects new
events. Increasing a PVC alone does not change the stream limit, and changing a
manifest alone does not resize an existing stream.

### 10. Check the application path

If NATS is healthy but events are not moving, follow the event in order:

```text
domain transaction -> outbox_events -> outbox publisher -> stream
                   -> consumer -> projector -> projection database
```

Check the relevant publisher and projector logs:

```sh
NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server report accounts

NATS_USER=sys NATS_PASSWORD=changeit \
  nats --no-context server report connections

kubectl logs -n accounts deployment/outbox-publisher --since=10m
kubectl logs -n entitlements deployment/outbox-publisher --since=10m
kubectl logs -n entitlements deployment/accounts-projector --since=10m
kubectl logs -n documents deployment/accounts-projector --since=10m
kubectl logs -n documents deployment/entitlements-projector --since=10m
```

Then check the NATS NetworkPolicy and the client Service endpoints:

```sh
kubectl describe networkpolicy nats -n nats
kubectl get endpointslice -n nats \
  -l kubernetes.io/service-name=nats-srv -o wide
```

The NATS NetworkPolicy explicitly allows the namespace and existing `app`
selector of each current publisher and projector. When a component is added or
renamed, its selector must be updated in the relevant event-bus overlay.

If an outbox row remains unpublished, debug the publisher connection or
publish error. If the stream contains the event but a consumer is pending,
debug that consumer. If the consumer acknowledged the event but the projection
is wrong, debug the projection transaction rather than NATS.

### 11. Verify container hardening

After changing the image, security context, or storage class, verify the live
process rather than trusting the rendered YAML:

```sh
kubectl exec -n nats nats-0 -- id

kubectl exec -n nats nats-0 -- sh -c \
  "grep -E '^(Uid|Gid|CapEff|NoNewPrivs|Seccomp):' /proc/1/status"

kubectl exec -n nats nats-0 -- sh -ec \
  'touch /data/.write-check; rm /data/.write-check; \
   touch /var/run/nats/.write-check; rm /var/run/nats/.write-check'

kubectl exec -n nats nats-0 -- sh -c \
  'if touch /.write-check; then \
     rm /.write-check; echo "unexpectedly writable"; exit 1; \
   fi'
```

Expected results are UID/GID `1000`, `CapEff` all zeroes, `NoNewPrivs: 1`,
seccomp mode `2`, successful writes to the two mounted paths, and a
`Read-only file system` error for the final root-filesystem write.

## Symptom map

| Symptom                                | Check first                                   | Usual layer                            |
| -------------------------------------- | --------------------------------------------- | -------------------------------------- |
| Pod is `Pending`                       | Events, PVC status, production node count     | Kubernetes scheduling/storage          |
| Pod is `CrashLoopBackOff`              | Current and `--previous` logs                 | Configuration, permissions, or storage |
| Pod is Running but not Ready           | The three `/healthz` forms                    | NATS or JetStream recovery             |
| Fewer than three server ping replies   | Pods, routes, DNS, NetworkPolicy              | NATS cluster networking                |
| No metadata leader                     | At least two healthy servers and their routes | JetStream quorum                       |
| No streams                             | Outbox publisher startup logs                 | Stream provisioning                    |
| Publish says `max_bytes` is required   | Product stream configuration                  | Missing explicit capacity              |
| Publish is rejected at the limit       | `stream state`, PVC space, outbox backlog     | Stream capacity                        |
| Consumer pending grows                 | Consumer and owning projector                 | Projector unavailable or slow          |
| Redeliveries grow                      | Consumer info and projector errors            | Handler failure or missing ack         |
| App cannot connect but NATS is healthy | Service endpoints and NetworkPolicy selectors | Kubernetes networking                  |
| `/data` permission denied              | Pod UID/GID, `fsGroup`, PVC ownership         | Container/storage permissions          |

## Do not use destructive commands for diagnosis

These operations delete data or delivery state and require a deliberate
recovery plan:

- `nats stream rm` or `nats stream purge`;
- `nats consumer rm` or `nats consumer reset`;
- deleting NATS PVCs or the `nats` namespace.

R3 replication protects availability from one server failure. It is not a
backup and does not protect against an operator deleting a stream or all PVCs.

## Manifest checks

```sh
kubectl kustomize platform/event-bus/overlays/ephemeral >/dev/null
kubectl kustomize platform/event-bus/overlays/prod-eu >/dev/null
git diff --check
```
