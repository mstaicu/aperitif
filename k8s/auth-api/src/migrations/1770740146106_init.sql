-- Up Migration

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY
);

CREATE TABLE webauthn_credentials (
    id UUID PRIMARY KEY 
        DEFAULT gen_random_uuid(),
    credential_id BYTEA NOT NULL UNIQUE,
    user_id UUID NOT NULL
        REFERENCES users(id) 
        ON DELETE CASCADE,

    credential_index SMALLINT NOT NULL
        CHECK (credential_index BETWEEN 1 AND 5),
    public_key BYTEA NOT NULL,
    sign_count BIGINT NOT NULL 
        DEFAULT 0
);

CREATE UNIQUE INDEX unique_user_credential_index
    ON webauthn_credentials(user_id, credential_index);

CREATE TABLE webauthn_challenges (
    id UUID PRIMARY KEY 
        DEFAULT gen_random_uuid(),
    user_id UUID,
    value BYTEA NOT NULL UNIQUE 
        DEFAULT gen_random_bytes(32),
    expires_at TIMESTAMPTZ NOT NULL 
        DEFAULT NOW() + INTERVAL '60 seconds'
);

-- useful if periodically cleaning expired challenges
CREATE INDEX idx_webauthn_challenges_expires_at
    ON webauthn_challenges(expires_at);

CREATE TABLE sessions (
    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    revoked_at TIMESTAMPTZ,

    refresh_token_hash BYTEA NOT NULL UNIQUE,

    refresh_expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_active_by_user_created
    ON sessions(user_id, created_at DESC, id DESC)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_sessions_refresh_expiration
    ON sessions(refresh_expires_at);