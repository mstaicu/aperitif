helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

helm search repo nats --versions

helm template nats nats/nats \
 --version 2.12.4 \
 --set config.jetstream.enabled=true \
 --set config.jetstream.memoryStore.enabled=true \
 --set config.cluster.enabled=true

helm show values nats/nats --version 2.12.4

```values.yaml

config:
  cluster:
    enabled: true
    replicas: 3

  jetstream:
    enabled: true
    fileStore:
      enabled: true
      pvc:
        enabled: true
        size: 20Gi

container:
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 2
      memory: 2Gi

podTemplate:
  configChecksumAnnotation: true
  topologySpreadConstraints:
    kubernetes.io/hostname:
      maxSkew: 1

promExporter:
  enabled: true

service:
  ports:
    leafnodes:
      enabled: false
    websocket:
      enabled: false
    mqtt:
      enabled: false
    gateway:
      enabled: false
```

```
# 1. Create operator with system account (SYS)

nsc add operator --name TMA --sys --generate-signing-key
nsc edit operator --require-signing-keys

# 2. Add accounts (one for SYS, one for your app)

# skip nsc add account --name SYS if the system account was already created with nsc add operator --sys ... (it usually is).

# nsc add account --name SYS

nsc edit account SYS --sk generate

nsc add account --name TMA
nsc edit account TMA --sk generate

# 3. Enable JetStream (if needed) on your app account

nsc edit account TMA \
 --js-mem-storage -1 \
 --js-disk-storage -1

# 4. Add users to accounts

nsc add user --account SYS --name sys
nsc add user --account TMA --name identities-api

# nsc generate creds --account SYS --name sys > sys.creds

nsc generate creds --account TMA --name identities-api > identities-api.creds

# These go on the nats instances

nsc describe operator --name TMA --raw
nsc describe account --name SYS --raw

# Test

kubectl port-forward -n nats pod/nats-depl-0 4222:4222

nsc list users
nsc generate creds --account SYS --name sys > sys.creds
nats --creds sys.creds -s nats://localhost:4222 server list
```