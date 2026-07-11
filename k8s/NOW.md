# Current Architecture Correction Brief

This is an implementation brief for an AI coding agent. Complete the work in
the stated order, keep each change reviewable, and do not broaden scope without
an explicit owner decision.

Read `AGENTS.md` and `TODO.md` completely before changing files.

## Owner decisions that are out of scope

Do not change these in this workstream:

- Do not move `k8s/.github/workflows`; the containing repository owns GitHub
  workflow discovery and placement.
- Do not productionize the in-cluster PostgreSQL Deployments. Managed database
  endpoints will replace them in a separate workstream.
- Do not rotate or split SOPS, JWT, or Cloudflare keys in this repository yet.
- Do not replace the host-wide refresh-cookie/BFF model.
- Do not add NATS authentication or per-workload subject ACLs yet.
- Never decrypt, print, or commit Secret payloads.

The deferred choices must remain visible in
`REQUIRED_PRODUCTION_REWRITES.md`; do not delete those findings merely because
they are not current implementation work.

## Task 1: fix nested Flux namespaces

**Status: implemented by flattening the cluster graph**

### Required changes

1. Keep `clusters/prod-eu/kustomization.yaml` pointed directly at the
   `platform/` and `domains/` directories.
2. Do not recreate intermediate Flux objects for those directories.
3. Do not add `flux-system` to application/platform workload overlays.
4. Keep all leaf `sourceRef` and `dependsOn` references same-namespace.

### Verification

Run:

```sh
kubectl kustomize clusters/prod-eu >/dev/null
kubectl kustomize clusters/prod-eu \
  | yq ea -e '[.] | map(select(.kind == "Kustomization")) | length == 22' - >/dev/null
kubectl kustomize clusters/prod-eu \
  | yq ea -e '[.] | map(select(.kind == "Kustomization")) | map(.metadata.namespace == "flux-system") | all' - >/dev/null
```

Also inspect the resulting names, paths, `sourceRef`, and `dependsOn` instead of
relying only on process exit status.

## Task 2: make the NATS StatefulSet valid

### Required changes

1. Add `whenUnsatisfiable: DoNotSchedule` to the existing hostname topology
   spread constraint in
   `platform/event-bus/overlays/prod-eu/nats-depl.yaml`.
2. Preserve the current required hostname anti-affinity.
3. Do not add a zone constraint until the cluster IaC defines available zones
   and node labels.

### Verification

1. Render `platform/event-bus/overlays/prod-eu`.
2. Validate the rendered resources with a Kubernetes schema validator such as
   `kubeconform`, including a pinned Kubernetes version.
3. When a disposable cluster is available, perform a server-side dry run.
4. Add the schema-validation command to the project check path; rendering to
   `/dev/null` alone is not an adequate test.

## Task 3: establish single ownership for domain Namespaces

**Status: deferred by owner; do not add foundation directories in the current
Flux correction.**

The duplicate Namespace ownership finding remains documented in `TODO.md` and
`REQUIRED_PRODUCTION_REWRITES.md`. Reopen it only with an explicitly agreed
minimal design.

## Task 4: add a baseline JWT profile without changing the refresh model

### Required changes

1. Add required identity configuration for a canonical issuer and one shared
   platform API audience.
2. Issue access tokens with:
   - `iss` set to the configured issuer;
   - `aud` set to the configured audience;
   - protected-header `typ: at+jwt`;
   - existing `alg: ES256` and `kid` values.
3. Make every resource API verify:
   - issuer;
   - audience;
   - `typ`;
   - explicit allowed algorithm `ES256`;
   - expiry and subject.
4. Extract the duplicated verifier into a small internal technical package or
   keep a synchronized local implementation if package extraction would make
   this patch too broad. Do not mix domain authorization into it.
5. Preserve the current shared audience and `operator` behavior.
6. Do not alter refresh-token cookies, rotation endpoints, or product BFFs.

### Required tests

- valid user token;
- valid operator token;
- wrong issuer;
- missing issuer;
- wrong audience;
- missing audience;
- wrong/missing `typ`;
- wrong algorithm;
- expired token;
- missing subject.

Update OpenAPI/authentication documentation so future product teams know that
the shared audience is temporary and where resource-specific audiences can be
introduced.

## Task 5: replace per-unit deployment mutation with one release transaction

The containing repository will decide where the workflow file physically
lives. Correct the reusable workflow design here so it can be integrated
without changing its semantics.

### Required design

1. Trigger one release workflow for a merge SHA.
2. Determine changed deployable units from that exact SHA and its merge base.
3. Build the exact SHA; never build moving `master` contents under an older SHA
   label.
4. Run unit, contract, migration, and production-image smoke checks before
   publishing.
5. Build changed images in a matrix and retain a machine-readable map of unit to
   immutable digest.
6. Use one release job to apply all digests to manifests.
7. Create one Git commit or one GitOps PR for the complete release.
8. Serialize only the final production mutation. Use a queue that retains all
   pending releases and handle Git conflicts explicitly.
9. Report which units, digests, migrations, and manifest commit constitute the
   release.

### Transitional containment

If the full workflow cannot be introduced in one patch:

1. stop checking out moving `master` for the build step;
2. stop using a shared native Actions concurrency group that replaces pending
   runs; either let every run reach the conflict-safe mutation step or place
   that step behind a real FIFO/external queue;
3. add retry/rebase handling to the manifest update;
4. document clearly that independent manifest commits are still non-atomic.

Do not present the transitional state as the completed solution.

## Final verification and handoff

Before declaring this brief complete:

```sh
make -C domains/identity check
make -C domains/accounts check
make -C domains/entitlements check
make -C domains/documents check
kubectl kustomize clusters/prod-eu >/dev/null
kubectl kustomize clusters/prod-eu/platform >/dev/null
kubectl kustomize clusters/prod-eu/domains >/dev/null
kubectl kustomize platform/event-bus/overlays/prod-eu >/dev/null
git diff --check
```

In addition, run the new schema, duplicate-ownership, JWT negative, and release
workflow tests introduced by these tasks. Report any check that could not run
and why. Never claim production readiness based only on Kustomize rendering.
