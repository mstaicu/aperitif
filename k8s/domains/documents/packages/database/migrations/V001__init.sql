-- Runtime grants.
GRANT USAGE
ON SCHEMA public
TO documents_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO documents_runtime;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO documents_runtime;

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

CREATE TABLE tenant_projection (
    tenant_id UUID PRIMARY KEY,

    version BIGINT NOT NULL
);

CREATE TABLE tenant_membership_projection (
    tenant_id UUID NOT NULL
        REFERENCES tenant_projection(tenant_id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    role TEXT CHECK (role IN ('owner', 'member')),

    version BIGINT NOT NULL,

    PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE workspace_projection (
    workspace_id UUID PRIMARY KEY,

    tenant_id UUID NOT NULL
        REFERENCES tenant_projection(tenant_id)
        ON DELETE CASCADE,

    version BIGINT NOT NULL
);

CREATE TABLE tenant_feature_projection (
    tenant_id UUID PRIMARY KEY,

    features JSONB NOT NULL,

    version BIGINT NOT NULL
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id UUID NOT NULL
        REFERENCES tenant_projection(tenant_id),

    workspace_id UUID NOT NULL
        REFERENCES workspace_projection(workspace_id),

    title TEXT NOT NULL,

    created_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);