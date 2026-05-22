CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE features (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    value_type TEXT NOT NULL CHECK (
        value_type IN ('boolean', 'number')
    ),

    merge_strategy TEXT NOT NULL CHECK (
        merge_strategy IN ('boolean_or', 'number_max', 'number_sum')
    ),

    CHECK (
        (value_type = 'boolean' AND merge_strategy = 'boolean_or')
        OR
        (value_type = 'number' AND merge_strategy IN ('number_max', 'number_sum'))
    )
);

COMMENT ON TABLE features IS 'Vocabulary of features that can be granted to tenants.';
COMMENT ON COLUMN features.id IS 'Stable feature identifier used by application code and other domains, for example members.max.';
COMMENT ON COLUMN features.name IS 'Human-readable feature name.';
COMMENT ON COLUMN features.value_type IS 'Expected value type for grants of this feature.';
COMMENT ON COLUMN features.merge_strategy IS 'Rule used to merge multiple tenant grants for this feature.';

CREATE TABLE tenant_features (
    tenant_id UUID NOT NULL,

    grant_id UUID NOT NULL,

    feature_id TEXT NOT NULL
        REFERENCES features(id),

    value JSONB NOT NULL,

    PRIMARY KEY (tenant_id, grant_id, feature_id)
);

COMMENT ON TABLE tenant_features IS 'Current tenant-specific grant inputs that contribute feature values. Effective tenant feature state is calculated from these rows and emitted as events.';
COMMENT ON COLUMN tenant_features.tenant_id IS 'Tenant receiving this feature grant.';
COMMENT ON COLUMN tenant_features.grant_id IS 'Stable identifier for one current grant. Multiple rows with the same grant_id belong to the same grant.';
COMMENT ON COLUMN tenant_features.feature_id IS 'Feature granted to the tenant.';
COMMENT ON COLUMN tenant_features.value IS 'Feature value contributed by this grant.';

CREATE SEQUENCE features_version_seq AS BIGINT;

COMMENT ON SEQUENCE features_version_seq IS 'Monotonic authority version assigned to features-domain events.';

-- Projections

CREATE TABLE tenant_projection (
    tenant_id UUID PRIMARY KEY,

    version BIGINT NOT NULL
);

COMMENT ON TABLE tenant_projection IS 'Local projection of tenancy-owned tenant authority used by the features domain.';
COMMENT ON COLUMN tenant_projection.tenant_id IS 'Tenant id owned by the tenancy domain.';
COMMENT ON COLUMN tenant_projection.version IS 'Latest upstream event version applied to this projected tenant.';

-- Outbox

CREATE TABLE outbox_events (
    position BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id UUID NOT NULL UNIQUE,

    event JSONB NOT NULL,

    published_at TIMESTAMPTZ
);

COMMENT ON TABLE outbox_events IS 'Transactional outbox for durable features-domain events waiting to be published to the event bus.';
COMMENT ON COLUMN outbox_events.position IS 'Local publish order for unpublished events.';
COMMENT ON COLUMN outbox_events.id IS 'Stable event id copied from event.id for database uniqueness and NATS msgID.';
COMMENT ON COLUMN outbox_events.event IS 'Complete event envelope published to the event bus.';
COMMENT ON COLUMN outbox_events.published_at IS 'Null until a worker successfully publishes the event.';

-- Wake workers once after an INSERT statement adds outbox rows.
-- This is only a notification signal; outbox_events remains the durable source.
CREATE FUNCTION notify_outbox_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('outbox_events', '');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outbox_events_notify_insert
AFTER INSERT ON outbox_events
FOR EACH STATEMENT
EXECUTE FUNCTION notify_outbox_event();

COMMENT ON FUNCTION notify_outbox_event() IS 'Sends a lightweight Postgres notification after an INSERT statement adds outbox rows. Workers must still query outbox_events because notifications are not durable.';

CREATE INDEX outbox_events_unpublished_idx
ON outbox_events (position)
WHERE published_at IS NULL;

COMMENT ON INDEX outbox_events_unpublished_idx IS 'Keeps worker scans cheap by indexing only unpublished outbox rows in publish order.';

-- Runtime roles are created by the placeholder Postgres init SQL. Flyway
-- creates the schema objects, so object-level runtime grants live here.
GRANT USAGE
ON SCHEMA public
TO features_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO features_runtime;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO features_runtime;

-- Future tables/sequences created by features_migrator should automatically
-- be usable by features_runtime without repeating grants in every migration.
ALTER DEFAULT PRIVILEGES
FOR ROLE features_migrator
IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLES TO features_runtime;

ALTER DEFAULT PRIVILEGES
FOR ROLE features_migrator
IN SCHEMA public
GRANT USAGE, SELECT
ON SEQUENCES TO features_runtime;
