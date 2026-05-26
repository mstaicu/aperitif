-- Default grants for future Flyway objects.
ALTER DEFAULT PRIVILEGES
FOR ROLE documents_migrator
IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLES TO documents_runtime;

ALTER DEFAULT PRIVILEGES
FOR ROLE documents_migrator
IN SCHEMA public
GRANT USAGE, SELECT
ON SEQUENCES TO documents_runtime;

--

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE projected_tenant_members (
    tenant_id UUID NOT NULL,

    user_id UUID NOT NULL,

    active BOOLEAN NOT NULL,

    permissions JSONB NOT NULL,

    version BIGINT NOT NULL,

    PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE projected_tenant_capabilities (
    tenant_id UUID PRIMARY KEY,

    capabilities JSONB NOT NULL,

    version BIGINT NOT NULL
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id UUID NOT NULL,

    title TEXT NOT NULL,

    created_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
