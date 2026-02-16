-- Up Migration

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY
);

CREATE TABLE webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    credential_id BYTEA NOT NULL UNIQUE,
    public_key BYTEA NOT NULL,

    algorithm TEXT NOT NULL
        CHECK (algorithm IN ('RS256', 'ES256', 'EdDSA')),
    transports TEXT[] DEFAULT '{}',

    sign_count BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_webauthn_credentials_user_id
    ON webauthn_credentials(user_id);
