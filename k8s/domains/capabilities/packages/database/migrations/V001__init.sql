-- Runtime grants.
GRANT USAGE
ON SCHEMA public
TO capabilities_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO capabilities_runtime;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO capabilities_runtime;

-- Default grants for future Flyway objects.
ALTER DEFAULT PRIVILEGES
FOR ROLE capabilities_migrator
IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLES TO capabilities_runtime;

ALTER DEFAULT PRIVILEGES
FOR ROLE capabilities_migrator
IN SCHEMA public
GRANT USAGE, SELECT
ON SEQUENCES TO capabilities_runtime;

--

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE capabilities (
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

CREATE TABLE tenant_capability_grants (
    tenant_id UUID NOT NULL,

    grant_id UUID NOT NULL,

    capability_id TEXT NOT NULL
        REFERENCES capabilities(id),

    value JSONB NOT NULL,

    PRIMARY KEY (tenant_id, grant_id, capability_id)
);

CREATE SEQUENCE capability_version_seq AS BIGINT;

CREATE TABLE projected_tenants (
    tenant_id UUID PRIMARY KEY,

    version BIGINT NOT NULL
);

CREATE TABLE outbox_events (
    position BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id UUID NOT NULL UNIQUE,

    event JSONB NOT NULL,

    published_at TIMESTAMPTZ
);

-- Notification only; outbox_events remains durable.
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