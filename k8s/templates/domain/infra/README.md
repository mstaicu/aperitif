# Infra Units

Expected Kubernetes shape:

```text
infra/
  db/
    base/
    overlays/dev
    overlays/live
  migrate/
    base/
    overlays/dev
    overlays/live
  api/
    base/
    overlays/dev
    overlays/live
  worker/
    base/
    overlays/dev
    overlays/live
```

Only add `worker` or `ui` infra when those deployable units exist.

Keep Secrets per deployable unit even when values are the same:

```text
<domain>-api-db
<domain>-migrate-db
<domain>-worker-db
```

API namespaces must opt in to Traefik route attachment when they own HTTPRoutes:

```yaml
metadata:
  labels:
    tma.com/gateway-access: traefik
```
