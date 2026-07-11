# Architecture TODOs Requiring Explanation or Decision

This file records the five audit findings that require explanation or an owner
decision. It is intentionally separate from `NOW.md`: this file explains the
failure mode and desired end state, while `NOW.md` is the implementation brief.

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
All leaf Flux objects are now produced in the root build, so the existing root
`namespace: flux-system` transformer applies directly.

### Done when

- The root render contains exactly 22 Flux `Kustomization` objects.
- Every leaf renders with `metadata.namespace: flux-system`.
- Every `sourceRef` and `dependsOn` resolves within `flux-system`.
- No intermediate Flux object is required to place or gate the leaves.

## Audit item 6: define what an identity access token is and which API may accept it

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

### Minimal correction that preserves early-product assumptions

Keep one platform-wide audience for now, but introduce configurable, validated
claims:

- issuer, for example `https://api.tma.com/v1/identity`;
- audience, for example `aperitif-api`;
- protected-header type `at+jwt`;
- explicit verification algorithm `ES256`.

All current APIs may temporarily accept the same audience. Later, the audience
can be split into `accounts-api`, `entitlements-api`, and product-specific
values without redesigning the token format.

Do not change the host-wide refresh-cookie design as part of this task; the
owner has explicitly accepted that early-stage tradeoff.

### Done when

- Identity always sets `iss`, `aud`, and `typ` when issuing an access token.
- Every API rejects a token with the wrong issuer, audience, type, algorithm,
  expiry, or missing subject.
- Tests cover wrong/missing claims and a valid token.
- Issuer and audience values are environment configuration rather than hidden
  constants.
- Existing user and operator behavior remains unchanged.

## Audit item 8: complete the NATS topology spread constraint

### What happens now

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

The manifest already has hard pod anti-affinity on hostname, so the least
surprising correction is:

```yaml
whenUnsatisfiable: DoNotSchedule
```

That preserves the existing intent of one NATS replica per node. A separate
zone-level spread rule should be added only after the production node and zone
contract is defined.

### Done when

- The production StatefulSet declares an explicit scheduling action.
- Kubernetes schema validation accepts the rendered StatefulSet.
- Three replicas remain schedulable on the intended production node topology.
- CI contains schema validation; a plain `kustomize build` is not considered
  sufficient.

## Audit item 9: give each Namespace exactly one Flux owner

### What happens now

Each domain unit includes its domain Namespace in its own overlay. For example,
the accounts Postgres, migration, API, and worker overlays all include a
`Namespace/accounts` manifest. Four separate Flux Kustomizations reconcile
those paths, and all four use `prune: true`.

Flux keeps an inventory per Kustomization. Sharing one object across inventories
creates competing ownership. If one unit stops rendering the Namespace or its
Flux Kustomization is removed, that inventory may prune the Namespace. Deleting
a Namespace cascades to every Deployment, Job, Secret, Service, and PVC inside
it, including resources owned by the other three units.

This is not a concern when repeatedly applying the same object manually with
`kubectl`; it is specifically an inventory and garbage-collection concern.

### Desired correction

Create one foundation unit per domain that owns:

- the Namespace;
- Pod Security labels;
- baseline NetworkPolicies;
- quota and limit defaults when introduced;
- domain-scoped service accounts and RBAC when introduced.

API, worker, migration, database, cleanup, and UI overlays must target the
Namespace but must not create it. Every leaf Flux Kustomization must depend on
its domain foundation.

Protect Namespaces from accidental garbage collection. Namespace deletion must
be an explicit, separately reviewed operation.

### Done when

- Exactly one rendered Flux inventory owns each Namespace.
- Removing any one API, worker, UI, migration, or database Kustomization cannot
  delete the Namespace.
- Local ephemeral deployment still creates each Namespace once before its
  units.
- A repository check fails if a Namespace is rendered by more than one Flux
  path.

## Audit item 10: make a multi-component deployment one release

### What happens now

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

Finally, every surviving job commits one manifest separately. There is no
single desired-state change representing the complete domain release.

### Desired correction

Use one release workflow:

1. Detect changed deployable units for the triggering merge SHA.
2. Build and test those exact sources in parallel.
3. Collect the resulting immutable image digests.
4. Update every affected manifest together.
5. Create one release commit or reviewed GitOps PR.
6. Let Flux apply the migration/runtime dependency graph from that one desired
   state.

If the independent workflows must remain temporarily, enable a real queue so
pending deployments are not replaced. That is only a containment fix; it does
not provide atomic releases or deterministic build provenance.

The physical placement of GitHub workflows is outside this project because the
owner will integrate them from the containing repository. The workflow logic
inside this project still needs to be correct before that integration.

### Done when

- Every image is built from the exact triggering commit.
- No changed unit can be silently canceled because another unit was queued.
- One release updates all affected image digests atomically.
- Migration and runtime changes cannot be partially represented in Git.
- Concurrent releases use conflict-safe queuing and Git updates.
