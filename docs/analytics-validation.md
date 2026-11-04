# Local analytics validation

## Session-authorized passkey addition: 2026-11-04

Deployed only the Identity API with the split signup/addition workflows and
session-authorized addition. Existing databases, streams and Analytics workloads
were preserved. Registration accepts only the new credential response and optional
name; an Authorization header selects addition to the authenticated principal.
Signup and credential removal retain their existing behavior. The UI proxy already
forwards this registration-only body.

The Identity domain check, nine generated-client checks and nine isolated
PostgreSQL regression scenarios passed. The regression verified zero authentication
ceremonies for addition, single-use registration challenges, invalid-session and
cross-principal rejection, anonymous completion rejection for an existing
principal's challenge, duplicate prevention, verifier failures, atomic fact rollback,
and a live-session check after waiting for a concurrent principal lock. WebAuthn
verification was mocked in those isolated scenarios.

With real Chromium WebAuthn through Traefik, all 87 normal API expectations passed
across all ten operations. The addition required one fewer request than the previous
88-case journey because it no longer requested authentication options.

**Confirmed security impact:** a separate 20-request exercise copied a valid bearer
token belonging to a fresh synthetic principal into requests associated with a
different browser authenticator. That authenticator could enroll its own key
without the original key, sign in after the original session was logged out, and
use its newly enrolled key to authorize removal of the original key. The original
key then failed sign-in. The synthetic attacker sessions were logged out afterward.
This demonstrated persistent account takeover after assumed bearer compromise;
it did not discover a token-exfiltration vulnerability or involve existing users.

The former existing-key proof blocked this escalation. The deployed session-only
policy intentionally removes that protection and is not equally resistant to
session theft. [OWASP recommends recent reauthentication for passkey enrollment](https://cheatsheetseries.owasp.org/cheatsheets/Passkey_Security_Cheat_Sheet.html).
A recent-session requirement could narrow the exposure window, but would still
accept a stolen session while it remained recent; it is not equivalent to fresh
existing-key proof on every credential change.

The two live exercises emitted 34 correct business facts, all matching complete
broker envelopes, source times and successful-request trace context in Analytics.
Seven credential facts exposed matching `credential_id` values. The outbox and
all three consumer backlogs were empty. These records describe operations accepted
by the current authorization policy; they do not establish the human owner's intent.

## Contracts 0.8.0: local rollout, 2026-11-04

Deployed Identity API and Analytics projector with the manually published
contracts `0.8.0`. Both running containers reported that version and passed
readiness. The reporting view now exposes `credential_id`.

The user approved resetting Identity, Analytics and Identity's two NATS streams.
Only those databases and `IDENTITY_STATE`/`IDENTITY_EVENTS` were reset. Normal
migration Jobs initialized the fresh datasets; PostgreSQL Pods and shared
infrastructure were preserved. Retention was suspended during the reset and
restored afterward. An empty database/stream baseline was verified before traffic.

All 88 public HTTP expectations passed with real browser WebAuthn, covering all
ten business operations. Analytics stored exactly 24 valid facts: two principal
registrations, five account creations, five membership creations, three credential
additions, one removal, five session establishments and three revocations. Their
complete broker envelopes, credential UUIDs, source times and HTTP observations
matched. All 34 event/snapshot deliveries retained trace context and message IDs.

Ten snapshots matched five source Accounts and five Memberships, including names,
roles, timestamps and versions. The fresh projections have no stale rows. The
reporting reader exposed all four credential facts under `credential_id` and
could not read the raw ledger. The outbox and all three consumer backlogs were
empty. New-fact ingestion lag was 521–708 ms in this local functional sample.

Docker Desktop disk pressure initially prevented migration Pods from scheduling.
Removing approximately 22.1 GB of unused build cache cleared the taint and both
migrations completed. The requested cleanup also removed 70 identified project
build containers, three obsolete project image tags and unused image layers.
Running images, current deployment images, networks and active volumes were
preserved. Two unreferenced PostgreSQL volumes were retained because ownership
could not be established. The temporary NATS port-forward was closed.

## Contracts 0.8.0: source verification, 2026-11-04

Identity API and Analytics projector dependencies and lockfiles now pin the
manually published `0.8.0`. Credential events and the reporting view use
`credential_id` for the credential record UUID. Both domain checks passed;
installed credential contract modules matched the reviewed package source.

An isolated PostgreSQL check exercised Identity routes and passed 13 resulting
outbox facts through the actual Analytics projector. All five credential facts
exposed the correct reporting ID. Reprocessing preserved stored rows and ingestion
times. Legacy `credential_ref` payloads were rejected. WebAuthn verification was
mocked; broker delivery and a cluster rollout were not exercised in this check.

This pre-live change updates V1 in place. Existing retained credential messages
use the old shape, and the deployed reporting view still has its old column.
A rollout must coordinate those datasets with the new contract and V001 schema;
this update did not reset or deploy the local workloads.

## Passkey workflow refactor: 2026-11-04

Deployed the current Identity API to `docker-desktop` through its existing
Skaffold module. PostgreSQL, migrations, shared infrastructure, retained messages
and existing Analytics data were preserved. No contract publication was needed;
the API and projector use the published contracts `0.7.0`.

Three agents independently reviewed deployment safety, public API journeys and
data/telemetry semantics. Two real Chromium WebAuthn journeys passed **127 HTTP
expectations**, covering all ten business operations, JWKS, OpenAPI UI/JSON/YAML,
the Identity UI and an unknown API route. An additional nine generated-client
checks passed against the deployed public API; its regenerated types compiled.
The deployed OpenAPI document is unchanged by the refactor. Documentation assets
returned 200. Internal API liveness/readiness and projector readiness returned
200; health endpoints remain unavailable through public ingress.

The scenarios exercised signup, independent sessions, multiple devices,
credential addition/removal, explicit logout, account ownership isolation,
overlapping account creation and token minting, malformed requests, proof replay,
cross-principal authorization and final-credential protection. The extra journey
also verified JWT signatures against public JWKS, rejected tampered/unsigned
tokens, admitted exactly one of two simultaneous logins using the same proof,
and preserved one usable credential during simultaneous opposing removals.
Both Identity and Analytics domain checks passed.

### Business facts and projections

| Event | Expected | Stored |
| --- | ---: | ---: |
| Principal registered | 4 | 4 |
| Account created | 5 | 5 |
| Membership created | 5 | 5 |
| Credential added | 6 | 6 |
| Credential removed | 2 | 2 |
| Session established | 9 | 9 |
| Session revoked | 7 | 7 |

All **38** complete envelopes validated against the published contracts and
matched JetStream payloads, exact subjects, message IDs and source mutation
times. Rejected operations, reads, options and access-token minting contributed
no business facts. Adding a credential created no session. Each successful
removal emitted revocations for its two live sessions, with their shared mutation
time. Two sessions remained from these journeys.

Ten new snapshots matched the five Account and five Membership projections,
including source creation dates, names, ownership roles and resource versions.
Source row deltas matched the public operations. The outbox was empty and all
three durable consumers had zero pending deliveries and acknowledgements.
The reporting reader role saw the correct typed totals and could not read the
raw ledger. Deployed stream settings matched the source JSON. The pre-existing
504 facts, their ingestion timestamps and all prior projections were unchanged.
The ledger ended at 542 unique facts and 1,022 retained event deliveries; this
run introduced 38 deliveries, with no replay exercise in this run.

### Operational telemetry

OpenObserve contained matching statuses for all 127 traced requests: 126 Identity
API SERVER spans and one Identity UI SERVER span. The inspected traces contained
1,247 spans across Traefik, Identity, the relay, projector and UI, all carrying
Kubernetes namespace metadata. All 38 new business facts were correlated with
their successful originating request and the exact relay-to-projector parent
span. The ten snapshots also had publish/project spans.

New-fact ingestion lag was 29–1,030 ms, with p95 1,026 ms. API SERVER span duration
p50 was 1.47 ms and p95 35.23 ms. These are short local functional samples, not
capacity measurements or production latency promises. A field/pattern scan of
the 1,247 spans and 296 logs found no credential/proof fields, JWT/private-key
patterns, HTTP bodies or database bind parameters. It does not prove absence of
arbitrary opaque secret values. Temporary browser contexts and the OpenObserve
port-forward were closed.

### Findings and analytical usefulness

- **Existing local dataset mismatch:** before this deployment, Analytics already
  retained 105 Account and 105 Membership projections while Identity contained
  five of each. The 100 extra rows in each projection survived earlier ephemeral
  source resets. These views describe latest observed resources; global totals
  do not establish current source inventory. This verification is scoped to its
  four new principals. Future intentional dataset resets need coordinated source,
  retained-state and projection lifecycle management. No reset was performed.
- **API metrics scope:** Identity exports traces but disables metrics export.
  Trace queries supported request/status/latency checks here. Dedicated API SLOs
  need HTTP metrics or an explicit trace-to-metrics policy that accounts for
  sampling; the observed Traefik metrics are not dedicated Identity API metrics.
- **Useful facts have specific meanings:** these events support observed Identity
  lifecycle counts, registration-to-account timing, credential adoption and
  session establishment/revocation histories. Authentication sessions are not
  analytical visits, revocation is not necessarily logout, and sign-in has no
  invented Account attribution. These facts alone do not measure unsuccessful
  attempts, abandonment, product activity/retention, unique humans or experiment
  effects. Those require facts from the relevant product/workflow owner.

No API or event correctness regression was found in these scenarios. Validation
used virtual authenticators, modest concurrency and local HTTP ingress. It did
not test production TLS/hardware authenticators, infrastructure failure, long
expiry windows or sustained load. Temporary runners stayed outside the
repository; this deployment added no packages or permanent test fixtures.

## Contracts 0.7.0: initial baseline

Deployed on 2026-11-02 using the manually published registry package. Both
Identity and Analytics domain checks passed. Installed contract modules and
examples matched the reviewed source; the package has individual contracts
without the shared Outcome API, AsyncAPI document or standalone schema copies.

- The relay created `IDENTITY_STATE` (`identity.state.*`) and `IDENTITY_EVENTS`
  (`identity.events.>`). Twelve snapshots and 18 unique events were copied with
  unchanged payloads, IDs and source times. Trace context was preserved.
- Analytics' disposable database was recreated through its normal V001 migration.
  Its 18 facts, six Accounts and six Memberships matched the previous business-data
  fingerprints after replay. Ingestion timestamps belong to the new dataset.
- Only after verification, the obsolete `IDENTITY` and `IDENTITY_DELTAS` streams
  were removed. Identity's source database was preserved.
- The API and projector run contracts `0.7.0` and pass readiness. The event-named
  reporting views exist; `analytics_reader` can select the approved view and
  cannot select the raw event ledger.
- All 66 HTTP expectations passed again with two fresh synthetic principals.
  The dataset now contains 36 unique events and eight Accounts/Memberships.
  All 36 original broker envelopes and 16 retained snapshots matched storage.
- Replaying the 36 envelopes increased retained deliveries to 72 without changing
  stored rows or ingestion timestamps. All three consumers caught up and the
  source outbox was empty. Deployed stream settings matched the JSON.

Counts by type are four registrations, four account creations, four memberships,
six credential additions, two removals, ten session establishments and six
revocations. They describe different grains; their sum is not a user-action count.
All 36 originals carried trace context and relay message IDs. Temporary browser
contexts and the readiness-probe port-forward were closed.

## Simplified V1 baseline: contracts 0.6.0

Deployed and exercised on 2026-11-02 against `docker-desktop`, using the manually
published registry package. Its artifacts matched the reviewed source byte for
byte. Both domain checks passed. Identity source data was preserved. The old
36-fact/72-delivery synthetic history was verified against the previous exercise
before clearing it and replacing only the disposable Analytics database.

- All 66 HTTP expectations passed, including real browser WebAuthn ceremonies.
- All 18 new broker envelopes matched Analytics storage and validated against
  the seven simplified contracts; none contained `operation_id` or envelope
  `subject`. All 18 originals retained trace context and relay message IDs.
- Counts were: two registrations, two accounts, two memberships, three credential
  additions, one removal, five session establishments and three revocations.
- Twelve retained snapshots matched six Accounts and six Memberships, including
  four plus four carried over from the earlier source data.
- Replaying the 18 envelopes increased retained deliveries to 36 without changing
  stored rows or ingestion timestamps. All three consumers caught up; source
  outbox count was zero. Readiness returned HTTP 200.
- Deployed stream configuration matched the JSON; all nine contract addresses
  mapped to exactly one intended stream.

This run used `IDENTITY`/`identity.account.v1.*`/`identity.membership.v1.*` for state
and `IDENTITY_DELTAS`/`identity.delta.>` for occurrences. These names were replaced
by the `0.7.0` deployment above; payloads are unchanged.
Temporary browser contexts and the API port-forward were closed.

## Earlier baseline: contracts 0.4.0 and 0.5.0

The historical counts and operation-correlation checks below describe the
superseded event shape; they are not claims about the simplified baseline.

Executed on 2026-11-02 against the `docker-desktop` cluster using the manually
published `@mstaicu/identity-contracts@0.4.0`. This is a synthetic two-principal
scenario, not customer research or evidence of production capacity.

## Deployment and exercise

- Deployed Identity PostgreSQL, migrations, API and outbox relay.
- Deployed Analytics PostgreSQL, migrations and V1 projector.
- Reset local NATS and its three data claims as requested; verified zero stored
  messages before resuming the relay and creating the scenario.
- Used real browser WebAuthn ceremonies through the deployed HTTP API.
- Existing Identity and Analytics `make check` commands passed.

All 66 HTTP expectations passed. Every business endpoint was exercised:

| Endpoint | Exercised responses |
| --- | --- |
| `POST /v1/passkeys/registration/options` | 200, 401 |
| `POST /v1/passkeys/registration` | 201 signup, 204 addition, 400, 422 |
| `POST /v1/passkeys/authentication/options` | 200 |
| `POST /v1/passkeys/authentication` | 200, 422 |
| `GET /v1/passkeys` | 200, 401 |
| `POST /v1/passkeys/:id/delete` | 204, 404, 409, 422 |
| `POST /v1/session/access-tokens` | 200, 401 |
| `DELETE /v1/session` | 204, 401 |
| `POST /v1/accounts` | 201, 400 |
| `GET /v1/accounts` | 200, 401, cross-principal isolation |

JWKS, OpenAPI UI/JSON/YAML and health probes returned 200; an unknown route
returned 404. Selected negative paths covered proof replay, fresh-proof
requirements, cross-principal proofs, final-credential protection, invalid tokens
and malformed bodies. Revoked session tokens could not mint new access tokens. Identity also rejected
already-issued JWTs bound to revoked sessions. A different domain validating JWTs
offline can still accept them until expiry; no global immediate-revocation claim
is established.

## Events and sink

| Event | Expected | Stored |
| --- | ---: | ---: |
| Principal registered | 2 | 2 |
| Account created | 2 | 2 |
| Membership created | 2 | 2 |
| Credential added | 3 | 3 |
| Credential removed | 1 | 1 |
| Session established | 5 | 5 |
| Session revoked | 3 | 3 |

The 18 complete broker envelopes matched the 18 stored envelopes. All validated
against their contracts and actual subjects. Ten operation groups and four
current-state snapshots produced two Accounts and two Memberships. Resource
IDs, initial roles and stored source creation/expiry timestamps matched.

All 18 original events carried valid trace context and a relay message ID equal
to the event ID. The source outbox drained and all three consumers caught up.

Restarting the projector preserved its durable names. Replaying the original 18
envelopes unchanged increased broker deliveries to 36, while the ledger remained
at 18, operation groups at ten and current-state rows at two plus two. The entire
stored dataset fingerprint, including ingestion timestamps, remained unchanged.

Finally, only the ephemeral Analytics database was replaced and its normal
migrations rerun. A new dataset identity created three fresh durable consumers.
They rebuilt the same 18 facts, ten operation groups and two plus two state rows
from 36 retained outcome deliveries. The business-data fingerprint matched;
ingestion timestamps correctly reflected the new collection. Only the three
obsolete consumers were removed afterward. The source database was unchanged.
All consumers caught up and the source outbox was empty.

## Simplification follow-up

The Analytics worker's unused development watcher and image stage were removed.
The normal production image shrank from 341,550,080 to 217,792,410 bytes
(approximately 36%). Its deployed process is now `tini` followed by `node`.
Replaying the same 18 envelopes again increased broker deliveries to 54 without
changing any stored row, including ingestion timestamps.

After the small Identity cleanup, the API was redeployed normally and the same
66-case exercise passed again with two fresh principals. Both passes therefore
completed 132 HTTP expectations. The combined sink contains 36 unique facts,
20 operation groups, four Accounts and four Memberships from 72 broker
deliveries. The first scenario's stored rows remained unchanged, and consumers
caught up. Published message shapes, type names and routing were unchanged.

The documentation now separates message purpose from payload representation;
see the [canonical terminology](domains.md#asynchronous). Illustrative counter
names were aligned to past-tense events and imperative commands without changing
any implemented wire contract.

## Contracts 0.5.0 deployment follow-up

After manual publication, Identity API and Analytics projector dependencies and
lockfiles were upgraded to `@mstaicu/identity-contracts@0.5.0`. Both domain
`make check` commands passed. Both application images were rebuilt and deployed
to `docker-desktop`; each running container reported contracts `0.5.0` and
readiness HTTP 200. Analytics retained 36 facts, four Accounts and four
Memberships; all three durable consumers had zero pending messages and zero
pending acknowledgements. This follow-up checked the package upgrade and
consumer continuity; it did not repeat the HTTP scenario above.

## Analytical usefulness

Actual queries found two recorded registrations, two account creations by the
correct principals, two positively correlated initial sessions, two initial-owner
memberships, and one later credential addition after a known registration.
First-account delays were 50 ms and 9 ms in the automated scenario; these are
exercise timings, not customer onboarding findings.

These facts can support explicit observed lifecycle cohort measures, including
registration to first account creation across separate operations. Mature
windows, population definitions and coverage still matter. They do not establish
signup success rates, unique humans, product activity, retention, revenue or
experiment effects.

The semantic review resulted in SQL descriptions that warn readers to:

- Select an event type before business aggregation; 18 facts are not 18 actions.
- Treat same-operation effects as co-effects, not independent funnel stages.
- Keep principal identity separate from unique-person assumptions.
- Avoid inventing account attribution by joining global events to memberships.
- Treat missing observations as unknown coverage, not certified zero activity.

Current membership roles are not historical roles. Session establishment is not
DAU or necessarily a returning sign-in; revocation is not necessarily logout.
Positive correlation can identify credential-removal revocations without guessing
the cause of other events. These distinctions follow the [grain and metric
definition practices](analytics.md#sources-and-applicable-conventions) reviewed
from Kimball, Uber, Spotify and Airbnb.

## Implementation finding and limits

The first deployment review found that the Analytics Docker context included
host `node_modules`, allowing stale dependencies to overwrite the normal image
installation. Adding the standard `.dockerignore` exclusion reduced the context
from approximately 142 MB to 148 KB. The deployed image was then checked for the
published SessionEstablished contract and its exact supported subjects.

This exercise covers the listed endpoint paths, source-to-sink preservation and
worker replay. It does not establish 30-day natural expiry, load capacity,
machine/storage failure tolerance or complete production business coverage.
No repository test fixtures, generator scripts or contract-distribution
automation were added for this exercise.

AsyncAPI HTTP endpoints are not implemented. For the current internal NATS API,
developer/agent access is the recommended default; raw JSON and schemas need the
same access policy as a viewer. [OWASP recommends restricting documentation to its
authorized audience](https://api-security.owasp.org/editions/2023/en/0xa9-improper-inventory-management/).
The published contract package is public, so HTTP restrictions do not make its
schemas confidential. Broker authorization remains a separate control.
