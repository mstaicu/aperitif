# Architecture TODOs Requiring Explanation or Decision

This file records audit findings and deferred decisions. It is intentionally
separate from `NOW.md`: this file explains the failure mode and desired end
state, while `NOW.md` is the implementation brief.

## Deferred: split ephemeral and production SOPS trust

**Status: deferred by owner; required before production traffic**

### What happens now

The encrypted ephemeral and prod-eu manifests use the same age recipient. The
private key supplied to CI for disposable Kind deployments can therefore also
decrypt production material. In addition, `.sops.yaml` matches
`overlays/dev` and `overlays/live`, while the actual directories are
`overlays/ephemeral` and `overlays/prod-eu`.

### Required correction

1. Generate separate ephemeral and production age key pairs.
2. Correct the `.sops.yaml` creation-rule paths to match `ephemeral` and
   `prod-eu`.
3. Re-encrypt ephemeral files only for the ephemeral recipient and production
   files only for the production recipient.
4. Store only the ephemeral private key in GitHub Actions for disposable Kind
   integration tests.
5. Store only the production private key in the prod-eu `flux-system/sops-age`
   Secret.
6. Verify that neither key can decrypt the other environment's files.

GitHub Actions must never receive the production private key. Production
decryption remains Flux's responsibility.

## Audit item 2: preserve the `flux-system` namespace in the nested Flux graph

**Status: resolved by removing the intermediate Flux reconciliation layer**

### Original failure mode

The root previously created intermediate Flux objects named `platform` and
`domains`. Those objects then performed new builds of the `platform/` and
`domains/` paths. The root namespace transformer did not carry into those later
builds, so the 22 leaf Flux objects had no namespace.

The graph had an unnecessary extra reconciliation layer:

```text
root build
  -> intermediate platform/domains Flux objects
  -> separate platform/domains builds
  -> 22 leaf Flux objects
```

It also made the complete platform an aggregate gate before the domain leaf
objects could be created.

### Implemented correction

The root Kustomize file now directly includes the existing directories:

- `clusters/prod-eu/platform`
- `clusters/prod-eu/domains`

The intermediate `platform.yaml` and `domains.yaml` Flux objects were deleted.
All leaf Flux objects are now produced in the root build. The `platform/` and
`domains/` Kustomize assemblers place their namespaced control resources in
`flux-system`; the root composes the cluster-scoped domain `Namespace` objects
directly so the namespace transformer cannot rename them.

### Done when

- The root render contains exactly the 17 composed Flux `Kustomization`
  objects.
- Every leaf renders with `metadata.namespace: flux-system`.
- Every `sourceRef` and `dependsOn` resolves within `flux-system`.
- No intermediate Flux object is required to place or gate the leaves.

## Audit item 6: define what an identity access token is and which API may accept it

**Status: current trust model accepted; additional claims deferred by owner**

### What happens now

Identity signs a short-lived JWT containing `sub`, optional `operator`, `iat`,
and `exp`. Resource APIs verify the signature and require `sub`, but they do not
require:

- `iss`: which identity authority issued the token;
- `aud`: which resource server the token was created for;
- `typ`: whether this is an access token rather than another JWT type;
- an explicit allowed algorithm;
- scopes or capabilities describing what the caller may do.

A valid signature answers only this question:

> Was this token signed by a private key corresponding to this JWKS?

It does not answer:

> Was it issued by the expected production authority, and was it intended for
> this API?

Today all APIs intentionally share one trust zone. That is workable for an
early platform, especially with a 60-second access-token lifetime, but it means
there is no cryptographic resource boundary between identity, accounts,
entitlements, documents, or a future product. If a signing key is reused across
environments, a token issued in one environment can also pass signature checks
in another.

### Owner decision

Development and production will use different signing key sets before
production traffic, and each environment will trust only its own JWKS. Within
one environment, Identity creates one JWT kind for one shared platform API trust
zone. Signature, expiry, and string-subject verification are accepted for that
model.

Add `iss` when a verifier trusts multiple logical issuers, `aud` when tokens are
targeted to different API boundaries, and `typ` when one signer creates multiple
JWT kinds. Add product audiences/scopes when cryptographic product isolation is
actually required. The host-wide refresh-cookie design remains unchanged.

### Current completion gate

- Development and production trust different JWT key sets before production
  traffic.
- APIs continue to reject invalid signatures, expired tokens, and tokens without
  a string subject.
- Future issuer, audience, type, or scope boundaries receive negative tests when
  activated.
- Existing user and operator behavior remains unchanged.

## Audit item 8: complete the NATS topology spread constraint

**Status: resolved by removing the incomplete spread constraint**

### Original failure mode

The production NATS StatefulSet specifies:

```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
```

Kubernetes also requires `whenUnsatisfiable`. Its valid values are:

- `DoNotSchedule`: refuse placement that would violate the constraint;
- `ScheduleAnyway`: permit placement but prefer a more even distribution.

Kustomize only combines YAML. It does not apply the Kubernetes API validation
that rejects an empty scheduling action, which is why the current render check
passes.

### Implemented correction

The incomplete topology-spread patch was removed. Production retains required
hostname pod anti-affinity, which directly expresses the current intent of one
NATS server per node. Do not add zone placement until the production node and
zone contract exists.

### Done when

- The production StatefulSet has no incomplete topology-spread constraint.
- Required hostname anti-affinity remains present.
- Three replicas remain schedulable on the intended production node topology.
- Both event-bus overlays render and the ephemeral deployment forms quorum.

## Audit item 9: give each Namespace exactly one Flux owner

**Status: resolved**

### Implemented correction

The root cluster reconciliation now owns `Namespace/identity`,
`Namespace/accounts`, and `Namespace/entitlements` exactly once through
`clusters/prod-eu/domains/*-namespace.yaml`.

All 13 production workload overlays retain their Kustomize `namespace:`
transformer but no longer render a Namespace resource. Their Flux inventories
therefore own only the workloads inside the domain and cannot prune the shared
Namespace.

Ephemeral overlays still render their Namespace resources so local modules can
start independently in a disposable cluster. No foundation directory or extra
Flux reconciliation layer was introduced.

### Done when

- Exactly one rendered Flux inventory owns each Namespace.
- Removing any one API, worker, UI, migration, or database Kustomization cannot
  delete the Namespace.
- Local ephemeral deployment still creates each Namespace once before its
  units.
- The root and all 13 production workload overlays render successfully.

## Audit item 10: make component deployment exact and collision-safe

**Status: resolved here; containing-repository integration remains external**

### Original failure mode

Each deploy caller starts an independent job, but all jobs use the same
`deployment-master` concurrency group. GitHub concurrency normally allows one
running job and only one pending job in a group. When a newer job becomes
pending, it replaces the previous pending job even though
`cancel-in-progress: false` protects the job that is already running.

For a commit touching a migration, API, and worker, the likely sequence is:

```text
migration job -> running
API job       -> pending
worker job    -> replaces/cancels the pending API job
```

The workflow also checks out the current `master` branch while labelling the
image with the triggering `github.sha`. A queued run can therefore build newer
branch contents under an older SHA label.

### Implemented correction

The repository now has one PR workflow and one release workflow. Changed domains
and components are discovered from their directory depth without a hardcoded
catalog. A matrix reads each changed component's image `name` from its colocated
`prod-eu` overlay and builds and pushes its SHA and `production` tags with
Docker's build action. Flux image policies resolve the production digests and
one image automation commits them into the marked component overlays.

Components without a `prod-eu` overlay are local-only. Actions writes only to
GHCR; Flux writes desired state to Git and remains the only cluster writer.

The physical placement of GitHub workflows is outside this project because the
owner will integrate them from the containing repository. The workflow logic
inside this project still needs to be correct before that integration.

### Done when

- Every image is built from the exact triggering commit.
- Every production image has a ready repository and policy in `flux-system`.
- Image automation writes the selected digest into the correct marked overlay.
- Actions writes only to GHCR; Flux alone writes Git and the cluster.
- Required migration ordering remains an explicit expand/contract merge and
  release discipline; the independent workflows do not infer it.
