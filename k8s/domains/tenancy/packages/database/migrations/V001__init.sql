CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    kind TEXT NOT NULL CHECK (kind IN ('personal', 'organization')),

    status TEXT NOT NULL CHECK (status IN ('pending', 'active')),

    version BIGINT NOT NULL DEFAULT 1,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenants IS 'Authority root used for tenant lifecycle, commercial ownership, and tenant-scoped product access.';
COMMENT ON COLUMN tenants.id IS 'Stable tenant identifier referenced by tenant-owned resources in other domains.';
COMMENT ON COLUMN tenants.name IS 'Human-readable tenant name shown to users and operators.';
COMMENT ON COLUMN tenants.kind IS 'Baseline tenant shape: personal for consumer use cases, organization for business use cases.';
COMMENT ON COLUMN tenants.status IS 'Lifecycle gate for tenant-scoped product access.';
COMMENT ON COLUMN tenants.version IS 'Monotonic tenant authority version; increment on tenant, membership, or requirement changes that consumers project.';
COMMENT ON COLUMN tenants.created_at IS 'Time the tenant record was created.';

CREATE TABLE tenant_memberships (
    tenant_id UUID NOT NULL
        REFERENCES tenants(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, user_id)
);

COMMENT ON TABLE tenant_memberships IS 'Users that can act inside a tenant.';
COMMENT ON COLUMN tenant_memberships.tenant_id IS 'Tenant where the user has authority.';
COMMENT ON COLUMN tenant_memberships.user_id IS 'Identity user id from the identity domain.';
COMMENT ON COLUMN tenant_memberships.role IS 'Tenant-level authority; owner manages the tenant, member can use tenant-scoped product capabilities.';
COMMENT ON COLUMN tenant_memberships.created_at IS 'Time the membership was granted.';

CREATE TABLE requirement_rules (
    subject_type TEXT NOT NULL,

    subject_kind TEXT NOT NULL,

    requirement_key TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'archived')
    ),

    PRIMARY KEY (subject_type, subject_kind, requirement_key)
);

COMMENT ON TABLE requirement_rules IS 'Requirement templates applied to a kind of authority subject, such as tenant organization requirements.';
COMMENT ON COLUMN requirement_rules.subject_type IS 'Authority boundary the rule applies to, such as tenant. Future domains may use workspace or membership.';
COMMENT ON COLUMN requirement_rules.subject_kind IS 'Kind inside the authority boundary, such as personal or organization for tenant rules.';
COMMENT ON COLUMN requirement_rules.requirement_key IS 'Stable requirement key to instantiate, such as terms.accepted or billing.setup.';
COMMENT ON COLUMN requirement_rules.status IS 'Active rules are applied to new matching subjects; archived rules are retained but not applied.';

-- Add future requirement rules with Flyway seed migrations. Each active rule is
-- copied into tenant_requirements when a matching tenant is created.

CREATE TABLE tenant_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id UUID NOT NULL
        REFERENCES tenants(id)
        ON DELETE CASCADE,

    requirement_key TEXT NOT NULL,

    status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),

    UNIQUE (tenant_id, requirement_key)
);

COMMENT ON TABLE tenant_requirements IS 'Activation requirements that must be completed before a tenant can become active.';
COMMENT ON COLUMN tenant_requirements.id IS 'Stable requirement row identifier.';
COMMENT ON COLUMN tenant_requirements.tenant_id IS 'Tenant this activation requirement belongs to.';
COMMENT ON COLUMN tenant_requirements.requirement_key IS 'Stable requirement key fulfilled by another domain, such as terms.accepted or identity.verified.';
COMMENT ON COLUMN tenant_requirements.status IS 'Requirement lifecycle tracked by tenancy from external fulfillment signals.';

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    subject TEXT NOT NULL,
    tenant_version BIGINT NOT NULL,

    schema_version INTEGER NOT NULL,

    payload JSONB NOT NULL,

    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,

    CONSTRAINT outbox_events_schema_version_positive CHECK (schema_version > 0)
);

COMMENT ON TABLE outbox_events IS 'Transactional outbox for durable tenant-domain events waiting to be published to the event bus.';
COMMENT ON COLUMN outbox_events.id IS 'Stable event id used by consumers for idempotency.';
COMMENT ON COLUMN outbox_events.subject IS 'Event bus subject, for example tenancy.tenant.created.';
COMMENT ON COLUMN outbox_events.tenant_version IS 'Tenant authority version consumers use to reject stale or out-of-order events.';
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
ON outbox_events (occurred_at, tenant_version, id)
WHERE published_at IS NULL;

COMMENT ON INDEX outbox_events_unpublished_idx IS 'Keeps worker scans cheap by indexing only unpublished outbox rows in publish order.';

-- Runtime roles are created by the placeholder Postgres init SQL. Flyway
-- creates the schema objects, so object-level runtime grants live here.
GRANT USAGE
ON SCHEMA public
TO tenancy_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO tenancy_runtime;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO tenancy_runtime;

-- Future tables/sequences created by tenancy_migrator should automatically
-- be usable by tenancy_runtime without repeating grants in every migration.
ALTER DEFAULT PRIVILEGES
FOR ROLE tenancy_migrator
IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLES TO tenancy_runtime;

ALTER DEFAULT PRIVILEGES
FOR ROLE tenancy_migrator
IN SCHEMA public
GRANT USAGE, SELECT
ON SEQUENCES TO tenancy_runtime;
