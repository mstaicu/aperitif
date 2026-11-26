# Bootstrap prod-eu

Run from the repository root against an existing cluster. Check `kubectl config current-context`. Set `GITHUB_TOKEN` and set `SOPS_AGE_KEY_FILE` to the private identity matching the [cluster's Age recipient](../.sops.yaml).

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
