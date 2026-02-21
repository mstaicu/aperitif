-- Up Migration

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY
);

CREATE TABLE webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id BYTEA NOT NULL UNIQUE,
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    credential_index SMALLINT NOT NULL
        CHECK (credential_index BETWEEN 1 AND 5),
    public_key BYTEA NOT NULL,
    algorithm TEXT NOT NULL
        CHECK (algorithm IN ('RS256', 'ES256', 'EdDSA')),
    transports TEXT[] DEFAULT '{}',
    sign_count BIGINT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX unique_user_credential_index
    ON webauthn_credentials(user_id, credential_index);

CREATE TABLE webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    value BYTEA NOT NULL UNIQUE DEFAULT gen_random_bytes(32),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '60 seconds'
);

-- useful if periodically cleaning expired challenges
CREATE INDEX idx_webauthn_challenges_expires_at
    ON webauthn_challenges(expires_at);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id
    ON sessions(user_id);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL
        REFERENCES sessions(id) ON DELETE CASCADE,
    token_hash BYTEA NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_session
    ON refresh_tokens(session_id);

CREATE INDEX idx_refresh_tokens_expiration
    ON refresh_tokens(expires_at);

-- Enforce at most one "active" refresh token per session at any time.
-- Rotation must revoke old token before inserting new.
CREATE UNIQUE INDEX uniq_active_refresh_per_session
    ON refresh_tokens(session_id)
    WHERE revoked_at IS NULL;