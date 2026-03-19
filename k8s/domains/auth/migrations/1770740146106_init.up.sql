-- Up Migration

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY
);

CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    credential_id BYTEA NOT NULL UNIQUE,

    user_id UUID NOT NULL
        REFERENCES users(id) 
        ON DELETE CASCADE,

    public_key BYTEA NOT NULL,

    sign_count BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID,

    challenge BYTEA NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL 
        DEFAULT NOW() + INTERVAL '2 minutes'
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    refresh_token_hash BYTEA NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ
);

-- Authority topology snapshot

CREATE TABLE access_projection (
    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
    tenant_id UUID NULL,
    roles TEXT[] NOT NULL DEFAULT '{}',

    PRIMARY KEY (user_id, tenant_id)
);