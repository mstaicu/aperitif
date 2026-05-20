CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    version BIGINT NOT NULL DEFAULT 1
);

COMMENT ON TABLE tenants IS 'Authority root used for tenant lifecycle, commercial ownership, and tenant-scoped access.';
COMMENT ON COLUMN tenants.id IS 'Stable tenant identifier referenced by tenant-owned resources in other domains.';
COMMENT ON COLUMN tenants.name IS 'Human-readable tenant name shown to users and operators.';
COMMENT ON COLUMN tenants.version IS 'Monotonic tenancy authority version; increment on tenant, membership, or workspace changes that consumers project.';

CREATE TABLE tenant_memberships (
    tenant_id UUID NOT NULL
        REFERENCES tenants(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),

    PRIMARY KEY (tenant_id, user_id)
);

COMMENT ON TABLE tenant_memberships IS 'Users that can act inside a tenant.';
COMMENT ON COLUMN tenant_memberships.tenant_id IS 'Tenant where the user has authority.';
COMMENT ON COLUMN tenant_memberships.user_id IS 'Identity user id from the identity domain.';
COMMENT ON COLUMN tenant_memberships.role IS 'Tenant-level authority; owner manages the tenant, member can use tenant-scoped features.';

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id UUID NOT NULL
        REFERENCES tenants(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL
);

COMMENT ON TABLE workspaces IS 'Operational resource containers inside a tenant.';
COMMENT ON COLUMN workspaces.id IS 'Stable workspace identifier referenced by workspace-scoped resources in other domains.';
COMMENT ON COLUMN workspaces.tenant_id IS 'Tenant that owns this workspace.';
COMMENT ON COLUMN workspaces.name IS 'Human-readable workspace name shown to users.';

CREATE INDEX workspaces_tenant_id_idx
ON workspaces (tenant_id, name, id);

CREATE TABLE outbox_events (
    position BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id UUID NOT NULL UNIQUE,

    event JSONB NOT NULL,

    published_at TIMESTAMPTZ
);

COMMENT ON TABLE outbox_events IS 'Transactional outbox for durable tenant-domain events waiting to be published to the event bus.';
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
