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
- Do not rotate or split SOPS or Cloudflare keys in this repository yet.
- Use separate JWT signing key sets for development and production before
  production traffic. Do not add `iss`, `aud`, or `typ` merely to duplicate the
  isolation already provided by those separate trust stores.
- Do not assume refresh credentials are confined to the current BFF; Identity
  is the authentication boundary for web, mobile, CLI, and future M2M clients.
- Do not add NATS authentication or per-workload subject ACLs yet.
- Do not replace the accepted one-row locked outbox publisher with leases,
  retry metadata, quarantine state, or a provisioning framework without an
  observed failure that requires it and explicit owner approval.
- Do not add NATS CPU or memory settings until usage has been measured.
- Do not make durable production telemetry export part of the current testing
  stage.
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
4. Set `namespace: flux-system` in the `platform/` and `domains/` Kustomize
   assemblers, and keep cluster-scoped domain Namespace resources in the root
   resource list; do not use a blanket root namespace transformer.
5. Keep all leaf `sourceRef` and `dependsOn` references same-namespace.

### Verification

Run:

```sh
kubectl kustomize clusters/prod-eu >/dev/null
kubectl kustomize clusters/prod-eu \
  | yq ea -e '[.] | map(select(.kind == "Kustomization")) | length == 17' - >/dev/null
kubectl kustomize clusters/prod-eu \
  | yq ea -e '[.] | map(select(.kind == "Kustomization")) | map(.metadata.namespace == "flux-system") | all' - >/dev/null
```

Also inspect the resulting names, paths, `sourceRef`, and `dependsOn` instead of
relying only on process exit status.

## Task 2: establish the current NATS and event-publication baseline

**Status: completed; do not broaden this stage**

The accepted baseline is:

1. A three-server NATS JetStream StatefulSet with explicit 1 GiB PVCs,
   server-wide storage ceilings, probes, graceful shutdown, a PDB, required
   production hostname anti-affinity, and hardened containers.
2. Product-owned streams with explicit `max_bytes` and replica counts.
3. A transactional outbox written with domain state in one database
   transaction.
4. `LISTEN/NOTIFY` used only to wake the worker; the outbox table remains the
   durable source of truth.
5. One unpublished row locked with `FOR UPDATE SKIP LOCKED`, published to
   JetStream, marked published only after PubAck, and committed before the
   worker selects another row.
6. The current durable, version-aware projection consumer acknowledges valid
   events only after committing its projection.

Do not add leases, attempt counters, next-attempt timestamps, quarantine
tables, inbox frameworks, automatic stream provisioners, authentication,
resource settings, or production telemetry in this stage. Reopen one of those
choices only when its concrete failure mode occurs or a production requirement
explicitly activates it.

### Verification

1. Render both event-bus overlays.
2. Run the Accounts and Entitlements worker tests.
3. When infrastructure changes, deploy the ephemeral overlay and verify three
   ready NATS servers, JetStream quorum, bound PVCs, and the PDB before treating
   the change as complete.

## Task 3: establish single ownership for domain Namespaces

**Status: implemented without a foundation directory or extra Flux layer**

The root cluster reconciliation owns each production domain Namespace once.
Production workload leaves retain their `namespace:` transformer but no longer
render Namespace resources. Ephemeral overlays remain self-contained.

## Task 4: preserve the current JWT trust model

**Status: additional token claims deferred by owner**

The accepted current model is:

1. Identity issues short-lived ES256 access tokens with a subject and expiry.
2. Resource APIs verify the signature and expiry against Identity's JWKS and
   require a string subject.
3. Development and production use different signing key sets before production
   traffic, and each environment trusts only its own JWKS.
4. All current APIs intentionally share one platform trust zone.

Add `iss` when a verifier trusts multiple logical issuers, `aud` when tokens are
targeted to different API boundaries, and `typ` when the same signer creates
multiple JWT kinds. Add product audiences/scopes only when product isolation is
required. Do not add those claims speculatively or change refresh-token cookies,
product BFFs, or `operator` behavior in this stage.

## Task 5: keep component delivery exact and collision-safe

**Status: implemented; containing-repository integration remains external**

The accepted implementation has exactly two workflows:

1. `pull-request.yaml` discovers changed domain directories and runs each
   domain's `check` in an independent matrix job with a disposable Kind cluster.
2. `release.yaml` discovers changed component directories after merge.
3. A `prod-eu` component overlay is the production-enrollment marker and must
   declare exactly one image. Its `name` is the GHCR destination.
4. A matrix builds changed production components from the triggering commit and
   publishes both the SHA and `production` tags with Docker's build action.
5. Flux image repositories and policies resolve the `production` digests, and
   one image automation commits them into the marked component overlays.
6. Actions writes only to GHCR. Flux writes desired state to Git and reconciles
   the cluster.

Do not restore per-domain or per-component caller workflows, hardcoded domain
lists, image-name derivation, a component catalog, or a release-state file.
Continue using expand/contract compatibility for independently rolling
components.

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

In addition, run the tests introduced by whichever tasks are activated. Do not
create or require tests for deferred work. Report any check that could not run
and why. Never claim production readiness based only on Kustomize rendering.
