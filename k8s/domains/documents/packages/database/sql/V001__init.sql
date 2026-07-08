CREATE EXTENSION "pgcrypto";

CREATE TABLE projected_account_members (
    account_id UUID NOT NULL,

    user_id UUID NOT NULL,

    role TEXT NOT NULL,

    version BIGINT NOT NULL,

    PRIMARY KEY (account_id, user_id)
);

CREATE TABLE projected_account_entitlements (
    account_id UUID PRIMARY KEY,

    entitlements JSONB NOT NULL,

    version BIGINT NOT NULL
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL,

    title TEXT NOT NULL,

    created_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
