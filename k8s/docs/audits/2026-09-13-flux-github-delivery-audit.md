# Flux and GitHub delivery audit

## Verdict

**Keep the current architecture.** Domain-owned Makefile checks, changed-component builds, and Flux tracking `latest` through immutable digests fit the platform. Flux explicitly supports this release pattern. [Source](https://fluxcd.io/flux/guides/image-update/)

The intended flow is:

**PR checks → merge to master → build changed components → scan → promote to latest → Flux commits digests → cluster reconciles.**

Two qualifications matter:

- `latest` means the latest **validated and promoted build of that component**. An older retry must not replace a newer release.
- Expand-contract permits independent deployment, but each phase must actually finish before the next depends on it. Manifest changes can reconcile before companion images finish publishing.

## What already works

- All nine image policies correctly track changes to the digest behind `latest`.
- All ten digest setters reference valid policies, including the shared relay in Accounts and Plans.
- All eighteen production overlays render, and every declared Flux dependency resolves.
- CI already delegates checks to Makefiles and scans images before promoting them.
- Digest-only infrastructure updates are excluded from image publishing, preventing rebuild loops.
- The selected Flux controllers and migration Job configuration are appropriate. Keep them.

## Address these first

### 1. Complete CI coverage

**Where:** [PR workflow](/Users/mircea/work/projects/mircea/aperitif/k8s/.github/workflows/pull-request-check.yaml), [Auth Makefile](/Users/mircea/work/projects/mircea/aperitif/k8s/domains/auth/Makefile), platform and cluster Makefiles.

CI currently selects domain and runtime changes but misses cluster, platform-infrastructure, and workflow changes. Auth checks also require KSOPS and decryption material that the workflow does not provision.

Extend selection to those areas, handle removed workloads, and add one stable required result that fails if selection or any required check fails. Make Auth checks runnable with disposable fixtures, without production secrets. Keep the actual validation commands in Makefiles. [GitHub guidance](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)

**Done when:** a fresh runner can execute the checks, and domain, infrastructure, workflow-only, and deletion changes all receive appropriate validation.

### 2. Finish reproducible bootstrap

**Where:** [cluster Makefile](/Users/mircea/work/projects/mircea/aperitif/k8s/clusters/prod-eu/Makefile), [cluster root](/Users/mircea/work/projects/mircea/aperitif/k8s/clusters/prod-eu/kustomization.yaml), production image setters.

The checked-in cluster has no generated Flux self-management resources, and its root does not include their directory. Ten workload references still contain all-zero placeholder digests. These are acceptable scaffolding, but not a completed deployment.

Require an explicit Kubernetes context, pin the Flux version, include the generated `flux-system` directory after bootstrap, and seed real image digests. Verify Git write access, registry pulls, and SOPS decryption. [Flux bootstrap guidance](https://fluxcd.io/flux/installation/configuration/bootstrap-customization/)

**Done when:** a disposable cluster bootstraps successfully, repeating bootstrap preserves its configuration, and all selected workloads become ready.

### 3. Make publication recoverable

**Where:** [publish workflow](/Users/mircea/work/projects/mircea/aperitif/k8s/.github/workflows/publish-images.yaml) and GitHub branch rules.

An old workflow retry can move `latest` backward. A failed Accounts publication will not automatically be repaired by a later Plans-only merge. Also, the publishing workflow itself does not run domain checks.

Keep build → scan → promote. Reject unintended older promotions, add a manual repair path for selected components at current master, and ensure the merged revision passed checks—either through an enforced merge gate or checks in this workflow. Reuse the scanned digest when retrying promotion.

`queue: max` is valid and worth keeping, but it does not guarantee commit ordering. [GitHub concurrency reference](https://docs.github.com/en/enterprise-cloud%40latest/actions/reference/workflows-and-actions/workflow-syntax)

**Done when:** retrying A after B cannot regress a component; a failed scan leaves `latest` unchanged; a failed publication can be repaired without an unrelated source edit.

## Then add these

| Item | Smallest useful change |
|---|---|
| Manifest validation | Add schema validation to root and leaf renders; rendering alone does not validate API fields. [Flux Schema](https://v2-9.docs.fluxcd.io/flux/cli-plugins/flux-schema/manifests-validation/) |
| E2E | Prepare a disposable cluster and call Auth’s existing `make e2e`. It currently assumes local infrastructure and is not called by CI. |
| Flux visibility | Configure the existing OTel collector to scrape controller metrics and collect Flux resource status into OpenObserve. Its image already bundles both required receivers. [Distribution](https://github.com/open-telemetry/opentelemetry-collector-releases/blob/v0.159.0/distributions/otelcol-k8s/manifest.yaml), [status receiver](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/receiver/k8sobjectsreceiver/README.md) |
| Recovery instructions | Distinguish holding image updates, stopping a component, and uninstalling it. Hold image automation before reverting a digest so it does not overwrite the rollback. |
| Maintenance | Pin actions to verified commit SHAs; document contract-package publishing and base-image rebuilds. |

For future clusters, use a unique cluster root and one automation writer per set of image setters. Introduce separate promotion scopes only when clusters need independent releases.

## Scope and limits

Based on implementation files and upstream research checked on **13 September 2026**, against commit `6399e3fb`; repository documentation was not treated as proof of correctness. Production cluster behavior, GitHub branch rules, registry visibility, and credentials were not verified. Successful rendering is not proof of successful deployment.

The existing `k8s` placement, ephemeral PostgreSQL, and unauthenticated application NATS connections are outside the findings. This audit changes no application or infrastructure code.
