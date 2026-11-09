# Bootstrap prod-eu

Run these commands from the repository root after selecting the production
Kubernetes context. They install Flux into an existing cluster; they do not
provision the cluster. Install the CLI tools from [Brewfile](../../Brewfile) first.

```sh
# Supply the GitHub token Flux uses to configure repository access.
export GITHUB_TOKEN='<github-token>'

# Select the existing private Age identity matching this cluster's encrypted Secrets.
export SOPS_AGE_KEY_FILE=/path/to/production-age-key

# Stop if the GitHub token is missing.
test -n "$GITHUB_TOKEN" || { echo "GITHUB_TOKEN is required"; exit 1; }

# Stop if the Age identity path is missing.
test -n "$SOPS_AGE_KEY_FILE" || { echo "SOPS_AGE_KEY_FILE is required"; exit 1; }

# Stop if the selected Age identity file does not exist.
test -f "$SOPS_AGE_KEY_FILE" || { echo "SOPS_AGE_KEY_FILE does not exist: $SOPS_AGE_KEY_FILE"; exit 1; }

# Generate the Flux namespace manifest locally, then create or update it in the cluster.
kubectl create namespace flux-system --dry-run=client -o yaml | kubectl apply -f -

# Create or update sops-age in flux-system, storing the private identity under age.agekey.
# The manifest passes directly to kubectl apply; no plaintext Secret file is written.
# -n selects the namespace; --from-file loads the identity under age.agekey.
# --dry-run and -o yaml generate the manifest; kubectl apply reads it from stdin.
kubectl create secret generic sops-age \
  -n flux-system \
  --from-file=age.agekey="$SOPS_AGE_KEY_FILE" \
  --dry-run=client -o yaml | kubectl apply -f -

# Bootstrap Flux using the following repository and controller settings.
# --owner: GitHub account owning the repository.
# --repository: repository containing the cluster configuration.
# --branch: branch Flux reconciles.
# --path: cluster configuration and bootstrap output directory.
# --personal: the owner is a personal account, rather than an organization.
# --components: install Git source and Kustomize reconciliation.
# --components-extra: install image discovery and automated digest updates.
# --version: pin the Flux controller release.
# --read-write-key: allow Flux's deploy key to push image-update commits.
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

Bootstrap generates and commits `flux-system/` here. Include that directory in
[kustomization.yaml](kustomization.yaml) so the cluster inventory also reconciles
Flux's own installation.

Keep the GitHub token and private Age identity outside Git. The
[.sops.yaml](.sops.yaml) file contains encryption authoring policy and the public
recipient; it is not the private identity or a Kubernetes resource.
