# Analytics

One PostgreSQL database and one projector workload. Identity is the first source;
public contracts and stored business facts do not depend on an analytics vendor.
The version-specific projector follows the Accounts projection at commit
`dba291e2a6a7447009d2fd0665be70f6cd89d219`: validate the contract and subject,
write inline transactional SQL, trace processing, and acknowledge after commit.

```text
Identity transaction + outbox → existing relay → JetStream
                                               ↓ durable consumers
Analytics: occurrence ledger + current state → reporting views
```

## Run locally

Start the platform event bus and Identity first; see `docs/operations.md`.
Use `make -C domains/analytics check`, `up`, `dev`, or `down`.
Checks run lint and type checking. The deployed validation and observed limits
are recorded in [the validation report](../../docs/analytics-validation.md).
Local PostgreSQL uses the existing disposable Deployment pattern. Replacing its
Pod discards its database; this local setup does not preserve analytical history.

`@mstaicu/identity-contracts` is pinned as a published dependency. Contract
distribution remains manual; checks and image builds use that registry release.
This change does not publish packages.

## Read

The versioned SQL boundary is `reporting.*_v1`. Provision a PostgreSQL login,
grant the NOLOGIN `analytics_reader` role, and explicitly permit the reader
workload in the PostgreSQL NetworkPolicy when adopting a tool or agent.
The current policy admits only migrations and the projector; a SQL role grant
alone does not enable a new network connection. Local superuser credentials are
for administration.

```sql
-- Observed committed events by UTC date and event type.
SELECT * FROM reporting.identity_daily_events_v1 ORDER BY date, type;
-- Lifecycle facts for one session.
SELECT * FROM reporting.identity_events_v1
WHERE session_id = '<uuid>' ORDER BY occurred_at;
-- Complete current membership, including current roles.
SELECT * FROM reporting.identity_memberships_v1 WHERE account_id = '<uuid>';
-- New sessions established during signup or later authentication.
SELECT * FROM reporting.identity_events_v1
WHERE type = 'identity.session.established.v1';
```

The event view preserves the complete producer-approved `data` payload,
including initial membership roles. SQL comments describe each dataset's grain
and meaning. Principal IDs are UUID references, stored as opaque text for readers.
Daily counts group distinct facts by source occurrence time; one
signup produces several facts, so summing event types does not count user actions.
The ledger contains different event types rather than one homogeneous business
fact table. Facts from one operation describe co-effects: registration and its
initial session, or account creation and its initial membership, are not separate
conversion stages. Their time differences measure processing, not user behavior.

Session establishment includes signup and later authentication. Session revocation
records explicit termination. The facts have no generic operation grouping ID;
shared principal IDs and nearby timestamps do not establish a common cause.
These datasets do not establish signup-session attribution, credential-removal
revocation attribution, returning sign-ins, logout
counts, attempted operations, experiment exposure, or complete historical coverage.
An empty result means no matching facts have been collected.

Independent operations support explicitly defined lifecycle research: recorded
registration to first recorded account creation, additional credentials after a
known registration, and subsequent session establishment. Define the observed
cohort, time window and maturity before calculating a rate. Principals are
identity subjects, not necessarily distinct humans. Additional engagement and
experiment analysis require the corresponding activity, eligibility, assignment,
actual exposure and outcomes from the domain/application owning the behavior.
Identity registration can itself be an experimental outcome once the population
and exposure are defined.
Joining global principal events to memberships can duplicate a row across
accounts. Session and credential facts do not identify an account unless they
actually carry one; membership alone does not establish that attribution.

Current account and membership views describe the latest observed state.
Joining an old event to them adds current context. Source `created_at` remains
the resource's creation time; it does not establish when the latest state changed.

## Delivery

- Validate each payload and actual NATS subject.
- Store each occurrence once per CloudEvents `(source,id)`.
- Apply complete current state only when its resource version increases.
- Acknowledge after the database commit.
- Fail visibly on malformed supported messages or database errors.

Three durable consumers use the dataset UUID stored in Analytics. A worker
restart resumes them. A fresh database gets fresh consumers for retained
occurrences and the latest retained state. Replay can only recover what the
broker still holds. Snapshots cannot reconstruct historical changes or events
that were never published.
The Identity occurrence stream evicts its oldest messages at the 400 MiB limit,
including unread messages. Facts already stored in Analytics are unaffected;
consumer recovery must happen before its missing messages leave the stream.

Subscriptions select supported V1 subjects. Future V2 uses a sibling projector
and subscription while V1 remains available during migration. Unsupported future
messages stay retained for their consumers; malformed supported messages fail.

OpenObserve receives operational telemetry correlated by message identity and
trace context, not copies of the canonical business envelopes. Retries/replays
can create additional spans; span counts are not unique business totals.
Broker backlog and acknowledgement
progress diagnose delivery; database/broker readiness does not prove freshness
or completeness. Agents read these views using explicitly granted authority;
analytical evidence does not grant production deployment or mutation privileges.
See the [ownership and producer/consumer blueprints](../../docs/analytics.md)
before adding flags, experiments, destination tools or agent workflows.

