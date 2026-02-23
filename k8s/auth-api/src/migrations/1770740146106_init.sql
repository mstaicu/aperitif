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

    -- pointer to current active refresh token
    refresh_token_hash BYTEA NOT NULL UNIQUE,

    refresh_expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_active_by_user_created
    ON sessions(user_id, created_at DESC, id DESC)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_sessions_refresh_expiration
    ON sessions(refresh_expires_at);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL
        REFERENCES sessions(id)
        ON DELETE CASCADE,

    token_hash BYTEA NOT NULL UNIQUE,

    issued_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    used_at TIMESTAMPTZ,

    reused_at TIMESTAMPTZ
);

-- 🔥 Enforce exactly ONE active refresh token per session
-- Active token = used_at IS NULL
CREATE UNIQUE INDEX unique_active_refresh_per_session
    ON refresh_tokens(session_id)
    WHERE used_at IS NULL;

CREATE INDEX idx_refresh_reuse_detected
    ON refresh_tokens(reused_at)
    WHERE reused_at IS NOT NULL;