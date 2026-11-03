CREATE SCHEMA ingest;
CREATE SCHEMA model;
CREATE SCHEMA reporting;

-- Database identity binds durable cursors to this dataset. A fresh database must
-- never reuse acknowledgements belonging to data that no longer exists.
CREATE TABLE ingest.dataset (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
INSERT INTO ingest.dataset DEFAULT VALUES;

CREATE TABLE ingest.events (
    source text NOT NULL,
    id text NOT NULL,
    type text NOT NULL,
    occurred_at timestamptz NOT NULL,
    ingested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    event jsonb NOT NULL,
    PRIMARY KEY (source, id)
);
CREATE INDEX ON ingest.events (type, occurred_at);

CREATE TABLE model.identity_accounts (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    created_at timestamptz NOT NULL,
    version bigint NOT NULL CHECK (version > 0)
);
CREATE TABLE model.identity_memberships (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL,
    -- Readers treat principal references as opaque identifiers.
    principal_id text NOT NULL,
    roles text[] NOT NULL,
    created_at timestamptz NOT NULL,
    version bigint NOT NULL CHECK (version > 0)
);
CREATE INDEX ON model.identity_memberships (account_id);

-- Stable reader boundary. Cross-resource state is eventual: membership may
-- arrive before account, so there is deliberately no foreign key or inner join.
CREATE VIEW reporting.identity_accounts_v1 AS
SELECT id AS account_id, name, created_at, version FROM model.identity_accounts;
CREATE VIEW reporting.identity_memberships_v1 AS
SELECT id AS membership_id, account_id, principal_id, roles, created_at, version
FROM model.identity_memberships;

CREATE VIEW reporting.identity_events_v1 AS
SELECT source, id AS event_id, type, occurred_at, ingested_at,
       event->'data'->>'principal_id' AS principal_id,
       (event->'data'->>'account_id')::uuid AS account_id,
       (event->'data'->>'membership_id')::uuid AS membership_id,
       (event->'data'->>'credential_ref')::uuid AS credential_ref,
       (event->'data'->>'session_id')::uuid AS session_id,
       (event->'data'->>'expires_at')::timestamptz AS expires_at,
       event->'data' AS data
FROM ingest.events
WHERE source = '/domains/identity' AND type IN (
    'identity.principal.registered.v1',
    'identity.account.created.v1',
    'identity.membership.created.v1',
    'identity.credential.added.v1',
    'identity.credential.removed.v1',
    'identity.session.established.v1',
    'identity.session.revoked.v1'
);

-- UTC occurrence dates, not ingestion dates. These are observed successful
-- events from the collection cutover, not attempts, active users, or funnels.
CREATE VIEW reporting.identity_daily_events_v1 AS
SELECT (occurred_at AT TIME ZONE 'UTC')::date AS date, type, count(*) AS events
FROM reporting.identity_events_v1 GROUP BY 1, 2;

COMMENT ON VIEW reporting.identity_daily_events_v1 IS
'Observed committed event counts by UTC source date and exact event type. Multiple types can describe one operation; do not sum them as user actions or treat same-operation effects as conversion stages. Missing rows are no observation, not certified zero. No unsuccessful attempts or pre-collection history. Owner: Analytics.';

-- Grant this NOLOGIN role to separately provisioned human/tool/agent logins.
-- Read-only readers cannot see arbitrary future raw event payloads or mutate data.
CREATE ROLE analytics_reader NOLOGIN;
GRANT USAGE ON SCHEMA reporting TO analytics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO analytics_reader;
COMMENT ON SCHEMA reporting IS
'Analytics-owned, versioned read boundary for humans, agents and replaceable tools. Owner: Analytics. Source: Identity public contracts. State is eventual; events begin at collection cutover.';
COMMENT ON VIEW reporting.identity_events_v1 IS
'Validated envelopes for seven Identity V1 event types, keyed by (source,event_id). Select a type before business aggregation. principal_id is an authentication identity, not a unique person. Entity references permit lifecycle joins, not proof of a shared operation or cause. occurred_at is source mutation time; ingested_at is arrival. No unsuccessful attempts or pre-collection history. Owner: Analytics.';
COMMENT ON VIEW reporting.identity_accounts_v1 IS
'One latest observed Identity account per account_id; source version guards reordering. Account creation time is source creation time, not ingestion time. Owner: Analytics.';
COMMENT ON VIEW reporting.identity_memberships_v1 IS
'One latest observed Identity membership per membership_id; roles are current, not role history. Membership/account arrival is independent. Joining global principal events can fan out across memberships and does not establish account attribution. Owner: Analytics.';
