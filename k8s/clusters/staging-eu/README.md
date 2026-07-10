# Staging EU Cluster

Staging is a placeholder. It does not currently have a full platform/domain
graph like `prod-eu`.

Before using it, add:

```text
kustomization.yaml
platform/*
domains/*
```

Use the prod-eu bootstrap pattern with:

```text
--path=k8s/clusters/staging-eu
```
