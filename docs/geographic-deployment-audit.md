# Geographic deployment audit

Reviewed 6 November 2026. Scope: Identity/accounts, telemetry, deployment and the
business-event contracts exercised by Analytics. This is an architecture audit;
no application or infrastructure changes were made. A declared production
overlay is not evidence of a running production environment.

## Starting point and recommendation

The requirements established in the discussion are EU first, later expansion,
ordinary SaaS personal data, and no established traffic or downtime target.
Analytics is primarily a contract-discovery and validation consumer, rather than
a production analytics platform to expand in this exercise.

Start with one durable EU write authority, high availability within that region,
approved EU backups, regional telemetry, and worldwide access through the edge.
Keep the existing business modules. Do not add global writable replication,
region fields throughout the schema, or a generic placement framework now.

This baseline means a supported local infrastructure failure should recover
through the chosen database/platform HA design. A complete regional outage can
still prevent login and writes until recovery. There is no availability promise
yet: select and rehearse a recovery design before making one to customers.

Four separate questions replace the vague country/continent/world progression:

| Question | Example |
| --- | --- |
| Where are the users? | Worldwide users can reach one EU origin. |
| Where is each dataset allowed to live and be accessed? | EU primary, EU backups, approved support access. |
| Which database may accept a particular write? | One authority for a principal's credentials and sessions. |
| How much failure and traffic must the service absorb? | Measure this independently of the number of countries. |

A cloud region is a deployment location. An availability zone is a separate
failure location within a provider region. Neither is automatically a legal
boundary. A country can need several deployments; a small worldwide service can
use one region. Europe, the EU, the EEA and the UK are different scopes.

## How to think about shared and local state

Shared/local describes where state is accessible. Correctness also depends on
what the state means and who owns it:

| Kind | Example | Rule |
| --- | --- | --- |
| Authoritative business/security state | Credentials, sessions, accounts and memberships. | One owner decides writes; replicas must preserve the required consistency. |
| Time-limited authoritative state | Single-use authentication challenges. | Short lifetime does not make independent copies safe to consume. |
| Derived state | A consumer's membership projection or event counts. | Define acceptable lag and recovery; it does not silently become the source authority. |
| Disposable process state | A rebuildable cache. | Loss is acceptable only if rebuilding preserves behavior. |
| Operational evidence | Logs, traces and metrics. | Its own location, access, retention and loss policy; it is not the business database. |

Several API instances already share Identity state through PostgreSQL. They need
no shared process memory. Multiple geographic writers introduce a different
problem: independent locks and potentially conflicting truths. An old membership
copy can be fine for a report while an old session copy can wrongly accept a
revoked session.

For each category, ask: who writes it, who may hold a copy, how stale that copy
may be, where it is allowed to go, and what restore/deletion must do to it.

## Investigation plan and work completed

| Workstream | Questions | Evidence collected |
| --- | --- | --- |
| Current deployment | What is actually declared? What survives replacement? | Workload/Flux/CI review and eight sanitized Kustomize inventories. |
| Identity authority | Can independent regions share principals, challenges and sessions safely? | Current service/SQL review; actual PostgreSQL 18.6 independent-writer experiments. |
| Events and validation consumer | Do deduplication, revisions and replay preserve meaning? | Current contracts/projector review; PostgreSQL and NATS consumer-recovery experiment. |
| Telemetry | What is captured, retained and exported? | Configuration and installed instrumentation review; synthetic in-memory trace probe. |
| Established practice | What patterns preserve simple regional ownership? | Official engineering examples and database/Flux documentation. |
| Privacy | Which copies, purposes, access paths and transfers need policy? | European Commission, EDPB, ICO and Cloudflare guidance. |

Three agents performed the initial parallel reviews; focused follow-up passes
covered telemetry and Analytics after scope clarification. Secrets were not
decrypted. Rendered Secret values were sanitized before inspection. Disposable
experiment containers were removed. No production load, regional outage or real
cross-region replication was tested.

## What is already strong

- Domain-owned databases and public contracts avoid cross-domain SQL coupling.
- Services receive a pool and configuration; deployment can select a database
  endpoint without adding geography decisions to each operation.
- Identity uses local transactions, principal locks and single-use challenges.
- Business changes and their outbox messages commit together.
- Consumers validate contracts and subjects, acknowledge after commit,
  deduplicate occurrences and apply only newer resource revisions.
- Opaque identifiers and standard WebAuthn JSON keep clients independent of
  hosting location and provider-specific payloads.
- Shared workload bases and location overlays already fit Flux multi-cluster
  deployment. Reusing software does not require sharing writable state.

These strengths support multiple API replicas against one primary. They do not
establish a capacity number or a multi-writer database design.

## Immediate findings

### 1. The declared production database is still disposable

The Identity PostgreSQL Deployment has one replica and no persistent volume,
standby or backup configuration. The production overlays still select the local
database service using development connection configuration. Replacing its
container can lose the database. This is a production blocker even for a service
used in one town.

Use a durable managed EU database with a tested HA and point-in-time recovery
design. Keep database provisioning outside business functions. Changing
`DATABASE_URL` alone is insufficient: existing NetworkPolicies allow database
egress only to local PostgreSQL pods. Provider networking, access rules, TLS and
credentials must be configured together.

Evidence: [PostgreSQL workload](../domains/identity/workloads/postgres/infra/base/deployment.yaml),
[production API database configuration](../domains/identity/workloads/api/infra/overlays/prod-eu/deployment.yaml),
[API egress policy](../domains/identity/workloads/api/infra/base/networkpolicy.yaml).

### 2. Extra clusters do not create data replication

Copying the current deployment into another cluster creates independent local
PostgreSQL and NATS state. A challenge issued in one location is absent in the
other; sessions and accounts are also separate. Pointing remote API instances at
the original EU database keeps one authority, but their database calls travel
back to the EU and still depend on it.

The current NATS production overlay has three persistent servers and host-level
anti-affinity. It has no enforced zone spread or cross-region stream copying.
R3 protects against a server failure while quorum survives; it is not a regional
disaster-recovery plan. NATS documents stream placement separately from connected
cluster topology. [NATS stream replication and placement](https://docs.nats.io/nats-concepts/jetstream/streams)

API, relay and ingress also have single-replica configurations. Scale them after
measuring CPU, database connections and failure behavior. Traefik additionally
has local ACME certificate state on a single-writer volume, so increasing its
replica count needs a certificate-management decision.

### 3. Identity needs one authority per principal's security state

Current challenge consumption, counters, session checks, credential removal and
session issuance rely on one database and its locks. A disposable experiment
duplicated pending state into two independent writers: the same signed proof
succeeded once in each writer, while replay in the original writer correctly
failed. This demonstrates a failure of the proposed independent-writer model;
it is not a bypass of the current single-writer deployment.

Keep security reads on the authoritative primary. Sending a session-validity
query to an asynchronous read replica can reintroduce stale revocation state.
PostgreSQL standbys do not turn local locks into globally coordinated locks.
[PostgreSQL standby tradeoffs](https://www.postgresql.org/docs/18/warm-standby.html)

An asynchronous restore or promotion can also lose a recently acknowledged
challenge consumption, revocation or credential removal. A recovery drill must
address those restored security records and prevent the former primary from
accepting writes. DNS failover alone does neither.

### 4. Account location and login location are separate decisions

Authentication is principal-scoped and happens before account selection. One
principal can belong to several accounts. Memberships also have local foreign
keys to both principals and accounts, and account creation commits ownership and
messages atomically. The experiment confirmed that an EU-only principal could
not create an account in an isolated US database: the foreign key rejected it
and the account transaction rolled back.

Therefore adding `account.home_region` would not decide where that person's
credentials, sessions and challenges belong. For the initial deployment, keep
this ownership unit together in the EU.

If later needed, compare these choices explicitly:

| Model | Benefit | Consequence |
| --- | --- | --- |
| Central Identity, regional Product data | Lowest initial application complexity. | Identity metadata has its own disclosed location and shared availability dependency. |
| Independent regional Identity realms | Strong regional separation with largely unchanged modules. | A person may have separate identities; cross-region account discovery and SSO are additional capabilities. |
| Shared login with regional account authorities | One login across region-bound accounts. | Requires a new trusted identity-reference/membership boundary; current local FKs cannot simply span regions. |

Keep the public relying-party strategy deliberate. Current `ORIGIN` derives
both the WebAuthn RP ID and expected origin. A regional hostname should not
accidentally change enrolled credential scope. Separate RP ID from approved
origins when multiple origins become necessary; moving backend infrastructure
alone need not change the public login domain.
[WebAuthn RP identifiers](https://www.w3.org/TR/webauthn-3/#relying-party-identifier)

### 5. Telemetry is part of the personal-data boundary

The current pipeline sends application and ingress telemetry plus collected
container logs through a cluster-local collector to cluster-local OpenObserve.
No worldwide export is configured. OpenObserve has a persistent volume and a
seven-day retention setting, but one replica and no inspected backup/recovery
configuration. Retention configuration still needs operational verification.

A synthetic probe of the actual Fastify instrumentation confirmed that a span's
`url.path` retained query values, including a signed-query value. This happened
on an unauthenticated 401 request. The collector has no redaction processor.
Traefik's access-log query suppression does not sanitize the separate application
trace path.

The same probe did not observe the bearer token in span attributes, and current
PG instrumentation captured SQL templates without bound parameter values. This
is an observed collection issue, not evidence of a production data breach or
blanket claim that request bodies and credentials are logged.

Prefer route templates, status, duration and deployment identity for routine
operations. Minimize URL attributes and scrub sensitive values before export.
Use existing instrumentation/collector controls first. Verify both attributes
and log bodies: the file-log parser retains the original body while also parsing
attributes. Define reader access, retention and regional export policy; keep
sampling and cardinality budgets deliberate.

The collector's in-memory queues are not a durable telemetry journal. Its
internal receivers have no configured authentication/TLS, and their policy
permits producers from all namespaces. Keep this within the intended trust
boundary; restrict and authenticate transport before crossing it. Bounded loss
may be acceptable for operational telemetry, so choose that policy before
building an HA telemetry platform. If baggage propagation has no intended use,
the standard propagator configuration can disable it; arbitrary baggage should
not become an accidental cross-region personal-data channel.

Evidence: [collector pipelines](../platform/cluster/observability/base/collector-config.yaml),
[log agent](../platform/cluster/observability/base/agent-config.yaml),
[OpenObserve configuration](../platform/cluster/observability/base/openobserve-statefulset.yaml),
[API instrumentation](../domains/identity/workloads/api/src/index.mjs).
OpenTelemetry provides explicit guidance on
[handling sensitive telemetry](https://opentelemetry.io/docs/security/handling-sensitive-data/).

### 6. Event contracts should remain useful without a global Analytics platform

Keep Analytics as the small validation consumer it was intended to be. Its
deduplication, subject validation, revisions and commit-before-ack behavior are
useful evidence that the business contracts can support independent consumers.
Do not change the source vocabulary to suit a warehouse or telemetry vendor.

Geography still affects event distribution: account names, membership links,
roles and stable activity identifiers travel with the feeds. Current subject
filters select supported event types, not residency boundaries. Many global
login/session facts have no account attribution; joining current memberships
does not establish which account caused a login.

The source streams are byte-bounded. State rejects new publication when full;
occurrence history evicts old messages. `max_age: 0` does not mean unlimited
history. A growing outbox and consumer lag need alerts before real consumers
depend on these feeds.

One recovery experiment rolled back Analytics rows while retaining the dataset
UUID and broker acknowledgements. Restart did not replay the missing retained
event; a fresh dataset identity created new consumers and recovered it. This
models an older backup restore, not an actual `pg_restore`. A restore procedure
must coordinate data and consumer cursors; reset/replay cannot recover events
already evicted. Keep this as a recovery lesson rather than building a generic
analytics recovery framework now.

Evidence: [stream configuration](../domains/identity/workloads/outbox-relay/infra/base/streams.json),
[consumer identity](../domains/analytics/workloads/projector/src/consumers.mjs),
[projector](../domains/analytics/workloads/projector/src/identity-v1.mjs).

## Privacy, residency and sovereignty

EU hosting is a sensible initial placement policy. GDPR allows international
transfers under applicable conditions; it is not a universal requirement to
store everything in the EU. A customer contract may impose a narrower location
promise. [European Commission transfer rules](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/rules-international-data-transfers_en)

Opaque UUIDs and linkable activity records can remain personal data. Removing
email addresses does not automatically anonymize the system.
[European Commission on personal and pseudonymised data](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en)

For each dataset, record its owner, processing purpose, controller/processor
roles, permitted locations, processors, access and retention. Collect only what
is needed and keep it for a justified duration.
[European Commission processing principles](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en)

| Dataset | Copies/access paths to account for |
| --- | --- |
| Principals, accounts, memberships and role relationships | Identity database, snapshots, consumers, exports and support access. |
| Public credential material and counters | Identity database, replicas and backups; private passkey keys remain with authenticators/providers. |
| Challenges and sessions | Authoritative database and recovery copies; session token is also returned to the client/UI cookie. |
| Business events | Outbox, JetStream and permitted consumers; activity identifiers remain linkable. |
| Logs, traces and metrics | Node files, collector buffers, OpenObserve, dashboards and any external export. |
| Backups and recovery exports | Storage location, encryption/access authority, retention and restore behavior. |
| Edge/request metadata | Cloudflare processing/logging settings and any third-party log destination. |

Storage location alone does not settle access or transfer scope. Making data
available to a separate processor abroad can be a transfer; organizational
relationships matter, so not every travelling employee access has identical
classification. [EDPB transfer guidance](https://www.edpb.europa.eu/system/files/2023-02/edpb_guidelines_05-2021_interplay_between_the_application_of_art3-chapter_v_of_the_gdpr_v2_en_0.pdf)

Cloudflare processing and metadata location are separate settings from our
origin location. Its localization products distinguish TLS processing from log
storage; inspect actual plan/settings and processors before promising a full
EU-only boundary. No application rate-limit change is proposed.
[Cloudflare localization](https://developers.cloudflare.com/data-localization/),
[metadata boundary](https://developers.cloudflare.com/data-localization/metadata-boundary/)

Define an export/erasure process across relevant source data, consumers and
restores. This can initially be an operator-run domain-owned procedure; a public
deletion endpoint or new privacy service is not inherently required. Retention
exceptions and shared account ownership need explicit handling. Backups need a
policy that prevents erased data returning to ordinary use after recovery.
[ICO backup-erasure guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/)

The existing model has no complete membership-removal/deletion feed or producer
reseed command. Add these semantics with real lifecycle and recovery operations,
rather than adding unused fields to every table.

## Replication: five different purposes

| Mechanism | Purpose | What it does not provide |
| --- | --- | --- |
| PostgreSQL standby | Database availability and possible failover. | Independent writable authorities or account-specific physical copying. |
| Cross-region standby | Recovery after regional loss. | Guaranteed zero data loss under asynchronous replication or automatic legal permission to copy. |
| Events and projections | Selected state/facts in another domain. | A transactional copy of Identity or a globally coordinated principal lock. |
| Telemetry export | Operational diagnosis and measurement. | A business ledger or backup. |
| Backups/PITR | Recover older durable state. | Immediate availability, automatic cursor reconciliation or protection against replaying erased state. |

No replication mechanism should default to copying every dataset everywhere.
Keep one active writer for a resource, approved copies, and a tested transfer of
authority. Prefer a database/provider-supported HA design over application-level
conflict resolution for the current security operations.

## Flux: simple regional deployments

Keep one Flux installation per cluster, each with a unique Git entrypoint. Reuse
existing workload bases and immutable application digests. A future layout could
be:

```text
clusters/
  prod-eu/            current declared cluster entrypoint
  prod-us/            future independent cluster entrypoint
domains/<domain>/workloads/<workload>/infra/
  base/
  overlays/prod-eu/
  overlays/prod-us/
```

Names above are examples, not directories to add now. A cluster is not
necessarily the database ownership boundary: several clusters can use one
regional authority if networking and operations support it.

For a second deployment, explicitly choose its database/bus endpoints, hosts,
RP/origins, issuer/key trust, storage classes, backup locations, telemetry
destination, secret recipients and automation write path. Literal copying would
retain EU settings, including the image-automation path. Never copy private
signing authority merely to make authentication work in another cluster.

The current per-image `latest` policies promote independently. Flux `dependsOn`
checks readiness; it does not prove that the migration required by a new API
digest has run. Use compatible expand/contract SQL and event releases, staged
regional promotion, and explicit version admission only when lockstep release
requirements justify it. Flux does not migrate accounts or replicate data.
[Flux repository structure](https://fluxcd.io/flux/guides/repository-structure/),
[dependency semantics](https://fluxcd.io/flux/components/kustomize/kustomizations/)

## Lessons from established platforms

- Slack's dated 2023 engineering account separated worldwide edge access from a
  largely regional core; cells improved failure containment. This is historical
  evidence, not a claim about its complete current topology.
  [Slack engineering](https://slack.engineering/slacks-migration-to-a-cellular-architecture/)
- Shopify's 2021 account of tenant-keyed pods supports placing a customer's work
  in one ownership unit. Moving a customer is an explicit migration operation.
  [Shopify engineering](https://shopify.engineering/mysql-database-shard-balancing-terabyte-scale)
- Atlassian's current residency scope distinguishes regional app content from
  central identity and other exclusions. A regional-content promise must say
  which data categories it covers; exclusions are contractual scope, not legal
  exemption. [Atlassian residency](https://support.atlassian.com/security-and-access-policies/docs/understand-data-residency/)

The useful common lesson is explicit ownership and routing, rather than a
particular cloud vendor or a requirement for global multiwriter SQL.

## Minimal module commitments

1. Keep one configured writer pool per domain authority and local transactions.
   Do not scatter regional pool selection through services.
2. Preserve opaque IDs and public contracts. Keep physical location out of IDs,
   WebAuthn proof payloads and routine business-event vocabulary.
3. Keep Product resources and authorization account-scoped. Treat account
   placement, when needed, as a routing/deployment decision outside operations.
4. Keep stable public login semantics. Add explicit RP/origin and JWT trust
   configuration when multiple origins or authorities actually require it.
5. Distribute approved feeds to named consumers. Do not treat global login facts
   as account-attributed facts or eventual Analytics views as live authority.
6. Keep raw telemetry regional by default and minimize what is emitted. Use
   collector/instrumentation configuration instead of per-operation logging code.
7. Make lifecycle removal, reseeding and restore behavior explicit when their
   operations are implemented. Keep historical facts distinct from current state.

Defer global SQL, bidirectional database replication, a worldwide message bus,
per-country code branches, automatic placement from user IP, a service mesh and
a generic placement/migration framework until a concrete requirement exists.

## Action order and future acceptance gates

**Before real production use:** durable EU database and tested restore; permitted
networking/TLS/secrets; security-aware failover; telemetry minimization/access;
explicit retention and backup locations; alerts for DB/broker/outbox health;
and a rehearsed process for applicable data requests. Address single-instance
failure points according to the selected availability target.

**Before consumers depend on current-state recovery:** implement and rehearse
producer reseed, projection rebuild, cursor/data recovery, lifecycle removal and
old-message replay handling. Keep Analytics itself a lightweight validation tool.

**Before a second write region:** establish an actual residency, latency,
capacity or regional-outage requirement. Decide Identity placement separately
from Product placement; prove one writer during cutover, approved replication,
old-writer fencing, routing continuity and deletion/backup handling.

Measurements should include representative operation latency from EU and distant
clients, CPU, pool/DB connection limits, lock waiting, outbox/consumer lag, stream
storage and recovery time. Test a load staircase to find the first bottleneck;
do not translate a hypothetical user count into an unverified capacity promise.

In recovery planning, RPO means how much recent data might be lost; RTO means how
long restoration may take. Start with managed in-region HA and measured recovery
before deciding whether cross-region continuity earns its additional cost.

Future drills: replace a database pod/node; lose one broker node and then quorum;
fill a state stream; restore an older database while newer messages exist;
verify revocation/credential removal after recovery; interrupt migration and API
promotion; and prove a remote partition cannot create a second writer. These
drills remain planned, not completed by this audit.
