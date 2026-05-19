CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE feature_definitions (
    code TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    type TEXT NOT NULL CHECK (
        type IN ('boolean', 'number')
    ),

    merge_strategy TEXT NOT NULL CHECK (
        merge_strategy IN ('boolean_or', 'number_max', 'number_sum')
    )
);

COMMENT ON TABLE feature_definitions IS 'Vocabulary of features that can be granted to tenants.';
COMMENT ON COLUMN feature_definitions.code IS 'Stable internal feature code used by application code, for example members.max.';
COMMENT ON COLUMN feature_definitions.name IS 'Human-readable feature name.';
COMMENT ON COLUMN feature_definitions.type IS 'Expected value type for grants of this feature.';
COMMENT ON COLUMN feature_definitions.merge_strategy IS 'Rule used to merge multiple tenant grants for this feature.';

CREATE TABLE tenant_feature_grants (
    tenant_id UUID NOT NULL,

    feature_code TEXT NOT NULL
        REFERENCES feature_definitions(code),

    grant_type TEXT NOT NULL,

    grant_ref TEXT NOT NULL,

    value JSONB NOT NULL,

    PRIMARY KEY (
        tenant_id,
        feature_code,
        grant_type,
        grant_ref
    )
);

COMMENT ON TABLE tenant_feature_grants IS 'Inputs that grant feature values to a tenant, such as operator grants, payment confirmations, compliance approvals, or rewards.';
COMMENT ON COLUMN tenant_feature_grants.tenant_id IS 'Tenant receiving this feature grant.';
COMMENT ON COLUMN tenant_feature_grants.feature_code IS 'Feature granted to the tenant.';
COMMENT ON COLUMN tenant_feature_grants.grant_type IS 'Local grant category, for example manual, payment, compliance, or reward.';
COMMENT ON COLUMN tenant_feature_grants.grant_ref IS 'Stable reference inside the grant category.';
COMMENT ON COLUMN tenant_feature_grants.value IS 'Feature value contributed by this grant.';

-- feature_definitions
-- tenant_feature_grants
--         |
--         v
-- tenant_features
--         |
--         v
-- outbox_events
--         |
--         v
-- FEATURES stream

CREATE TABLE tenant_features (
    tenant_id UUID NOT NULL,

    feature_code TEXT NOT NULL
        REFERENCES feature_definitions(code),

    value JSONB NOT NULL,

    version BIGINT NOT NULL,

    PRIMARY KEY (tenant_id, feature_code)
);

COMMENT ON TABLE tenant_features IS 'Current feature values for each tenant. Events are emitted from this authority table.';
COMMENT ON COLUMN tenant_features.tenant_id IS 'Tenant that owns this feature value.';
COMMENT ON COLUMN tenant_features.feature_code IS 'Feature code.';
COMMENT ON COLUMN tenant_features.value IS 'Current feature value after grants are merged.';
COMMENT ON COLUMN tenant_features.version IS 'Monotonic authority version assigned when this tenant feature value changes.';

CREATE SEQUENCE features_version_seq AS BIGINT;

COMMENT ON SEQUENCE features_version_seq IS 'Monotonic authority version assigned to features-domain events.';

-- Projections

CREATE TABLE tenant_projection (
    tenant_id UUID PRIMARY KEY,

    status TEXT NOT NULL CHECK (status IN ('active', 'archived')),

    tenant_version BIGINT NOT NULL
);

COMMENT ON TABLE tenant_projection IS 'Local projection of tenancy-owned tenant authority used by the features domain.';
COMMENT ON COLUMN tenant_projection.tenant_id IS 'Tenant id owned by the tenancy domain.';
COMMENT ON COLUMN tenant_projection.status IS 'Projected tenant lifecycle status from tenancy events.';
COMMENT ON COLUMN tenant_projection.tenant_version IS 'Latest tenancy authority version applied to this projected tenant.';

CREATE TABLE tenant_membership_projection (
    tenant_id UUID NOT NULL
        REFERENCES tenant_projection(tenant_id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    role TEXT CHECK (role IN ('owner', 'member')),

    status TEXT NOT NULL CHECK (status IN ('active', 'deleted')),

    tenant_version BIGINT NOT NULL,

    PRIMARY KEY (tenant_id, user_id)
);

COMMENT ON TABLE tenant_membership_projection IS 'Local projection of tenancy-owned tenant memberships used by the features domain.';
COMMENT ON COLUMN tenant_membership_projection.tenant_id IS 'Tenant id owned by the tenancy domain.';
COMMENT ON COLUMN tenant_membership_projection.user_id IS 'Identity user id projected from tenancy membership events.';
COMMENT ON COLUMN tenant_membership_projection.role IS 'Projected tenant role when the membership is active.';
COMMENT ON COLUMN tenant_membership_projection.status IS 'Projection row status. Deleted rows are tombstones for stale-event protection.';
COMMENT ON COLUMN tenant_membership_projection.tenant_version IS 'Tenancy authority version that last changed this projected membership.';

-- Outbox

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    subject TEXT NOT NULL,

    tenant_id UUID NOT NULL,

    version BIGINT NOT NULL,

    schema_version INTEGER NOT NULL,

    payload JSONB NOT NULL,

    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,

    CONSTRAINT outbox_events_schema_version_positive CHECK (schema_version > 0)
);

COMMENT ON TABLE outbox_events IS 'Transactional outbox for durable features-domain events waiting to be published to the event bus.';
COMMENT ON COLUMN outbox_events.id IS 'Stable event id used by consumers for idempotency.';
COMMENT ON COLUMN outbox_events.subject IS 'Event bus subject, for example features.tenant_features.updated.';
COMMENT ON COLUMN outbox_events.tenant_id IS 'Tenant whose features changed.';
COMMENT ON COLUMN outbox_events.version IS 'Features authority version emitted as features_version on the event envelope.';
COMMENT ON COLUMN outbox_events.schema_version IS 'Event payload schema version used by consumers to select the correct decoder.';
COMMENT ON COLUMN outbox_events.payload IS 'JSON event body published to the event bus.';
COMMENT ON COLUMN outbox_events.occurred_at IS 'Time the domain event was recorded in the same transaction as the state change.';
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
ON outbox_events (occurred_at, version, id)
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
