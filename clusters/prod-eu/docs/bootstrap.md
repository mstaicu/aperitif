# Bootstrap prod-eu

Run these commands from the repository root.

## Render the installation

Before bootstrap, pipe a local root declaration into Flux. The recursive build follows each workload's `spec.path` against this checkout. This checks the manifests offline. The running controllers verify Secret decryption and workload readiness during reconciliation.

```sh
flux create kustomization flux-system --export --source=flux-system --path=./clusters/prod-eu |
  flux build kustomization flux-system --dry-run --recursive \
    --path=./clusters/prod-eu --kustomization-file=/dev/stdin \
    --local-sources=GitRepository/flux-system/flux-system=.
```

After bootstrap, use the generated root declaration.

```sh
flux build kustomization flux-system --dry-run --recursive \
  --path=./clusters/prod-eu --kustomization-file=clusters/prod-eu/flux-system/gotk-sync.yaml \
  --local-sources=GitRepository/flux-system/flux-system=.
```

## Bootstrap the cluster

Check `kubectl config current-context`. Set `GITHUB_TOKEN` and set `SOPS_AGE_KEY_FILE` to the private identity matching the [cluster's Age recipient](../.sops.yaml).

Create the Flux namespace and load the decryption key. Continue after both commands succeed.

```sh
kubectl create namespace flux-system --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic sops-age -n flux-system \
  --from-file=age.agekey="${SOPS_AGE_KEY_FILE:?set the path to the cluster Age identity}" \
  --dry-run=client -o yaml | kubectl apply -f -
```

Install the controllers with a writable deploy key for image automation.

```sh
flux bootstrap github \
  --owner=mstaicu \
  --repository=aperitif \
  --branch=master \
  --path=clusters/prod-eu \
  --personal \
  --components=source-controller,kustomize-controller \
  --components-extra=image-reflector-controller,image-automation-controller \
  --version=v2.9.4 \
  --read-write-key
```

After bootstrap generates `clusters/prod-eu/flux-system/`, include `flux-system` in the [cluster inventory](../kustomization.yaml) and commit that change. Check reconciliation with `flux get kustomizations --all-namespaces`.
