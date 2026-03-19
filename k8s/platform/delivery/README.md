brew install fluxcd/tap/flux
flux check --pre
kubectl-slice -o wtfa -f flux-install.yaml

# https://github.com/fluxcd/flux2/releases

flux --version
flux version 2.8.1

flux bootstrap github \
 --owner=mstaicu \
 --repository=aperitif \
 --branch=master \
 --path=clusters/prod-eu \
 --personal

# 1

flux bootstrap github \
 --components=source-controller,kustomize-controller \
 --components-extra=image-reflector-controller,image-automation-controller

flux bootstrap github \
 --components=source-controller,kustomize-controller

Default bootstrap includes:

source
kustomize
helm
notification
image-reflector -> Watches container registries
image-reflector -> Commits changes to Git

You must add image controllers explicitly:

flux bootstrap github \
 --components=source-controller,kustomize-controller \
 --components-extra=image-reflector-controller,image-automation-controller

# 2

flux install \
 --version=v2.8.1 \
 --export > flux-install.yaml

flux install \
 --version=v2.8.1 \
 --components=source-controller,kustomize-controller \
 --export > flux-install.yaml

flux install \
 --version=v2.8.1 \
 --components=source-controller,kustomize-controller \
 --components-extra=image-reflector-controller,image-automation-controller \
 --export > flux-install.yaml

# 3

| Secret       | Used By              | Required For        |
| ------------ | -------------------- | ------------------- |
| `github-ssh` | source-controller    | Pulling/pushing Git |
| `sops-age`   | kustomize-controller | Decrypting secrets  |

source-controller → uses github-ssh
kustomize-controller → uses sops-age
image-automation-controller → also uses github-ssh

