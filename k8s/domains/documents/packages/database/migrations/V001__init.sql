CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tenant_projection (
    tenant_id UUID PRIMARY KEY,

    version BIGINT NOT NULL
);

COMMENT ON TABLE tenant_projection IS 'Local projection of tenancy-owned tenant authority used by the documents domain.';
COMMENT ON COLUMN tenant_projection.tenant_id IS 'Tenant id owned by the tenancy domain.';
COMMENT ON COLUMN tenant_projection.version IS 'Latest upstream event version applied to this projected tenant.';

CREATE TABLE tenant_membership_projection (
    tenant_id UUID NOT NULL
        REFERENCES tenant_projection(tenant_id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    role TEXT CHECK (role IN ('owner', 'member')),

    version BIGINT NOT NULL,

    PRIMARY KEY (tenant_id, user_id)
);

COMMENT ON TABLE tenant_membership_projection IS 'Local projection of tenancy-owned tenant memberships used by the documents domain.';
COMMENT ON COLUMN tenant_membership_projection.tenant_id IS 'Tenant id owned by the tenancy domain.';
COMMENT ON COLUMN tenant_membership_projection.user_id IS 'Identity user id projected from tenancy membership events.';
COMMENT ON COLUMN tenant_membership_projection.role IS 'Projected tenant role.';
COMMENT ON COLUMN tenant_membership_projection.version IS 'Latest upstream event version applied to this projected membership.';

CREATE TABLE workspace_projection (
    workspace_id UUID PRIMARY KEY,

    tenant_id UUID NOT NULL
        REFERENCES tenant_projection(tenant_id)
        ON DELETE CASCADE,

    version BIGINT NOT NULL
);

COMMENT ON TABLE workspace_projection IS 'Local projection of tenancy-owned workspace authority used by the documents domain.';
COMMENT ON COLUMN workspace_projection.workspace_id IS 'Workspace id owned by the tenancy domain.';
COMMENT ON COLUMN workspace_projection.tenant_id IS 'Tenant that owns the workspace.';
COMMENT ON COLUMN workspace_projection.version IS 'Latest upstream event version applied to this projected workspace.';

CREATE TABLE tenant_feature_projection (
    tenant_id UUID PRIMARY KEY,

    features JSONB NOT NULL,

    version BIGINT NOT NULL
);

COMMENT ON TABLE tenant_feature_projection IS 'Local projection of features-owned tenant feature snapshots used by the documents domain.';
COMMENT ON COLUMN tenant_feature_projection.tenant_id IS 'Tenant whose feature snapshot is projected.';
COMMENT ON COLUMN tenant_feature_projection.features IS 'Projected effective feature snapshot.';
COMMENT ON COLUMN tenant_feature_projection.version IS 'Latest upstream event version applied for this tenant.';

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

COMMENT ON TABLE documents IS 'Workspace-scoped documents owned by the documents domain.';
COMMENT ON COLUMN documents.id IS 'Stable document id.';
COMMENT ON COLUMN documents.tenant_id IS 'Tenant authority root for the document.';
COMMENT ON COLUMN documents.workspace_id IS 'Workspace resource boundary for the document.';
COMMENT ON COLUMN documents.title IS 'Human-readable document title.';
COMMENT ON COLUMN documents.created_by IS 'Identity user id that created the document.';
COMMENT ON COLUMN documents.created_at IS 'Time the document was created.';

CREATE INDEX documents_workspace_idx
ON documents (workspace_id, created_at DESC, id);

-- Runtime roles are created by the placeholder Postgres init SQL. Flyway
-- creates the schema objects, so object-level runtime grants live here.
GRANT USAGE
ON SCHEMA public
TO documents_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO documents_runtime;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO documents_runtime;

-- Future tables/sequences created by documents_migrator should automatically
-- be usable by documents_runtime without repeating grants in every migration.
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
