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

-- Verify what that library returns.

-- Some libraries return numeric COSE values:

-- -7 (ES256)

-- -257 (RS256)

-- -8 (EdDSA)

-- If it returns numeric, this check will fail.

    algorithm TEXT NOT NULL
        CHECK (algorithm IN ('RS256', 'ES256', 'EdDSA')),
    transports TEXT[] DEFAULT '{}',

    sign_count BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_webauthn_credentials_user_id
    ON webauthn_credentials(user_id);

CREATE TABLE webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID,

    value BYTEA NOT NULL UNIQUE DEFAULT gen_random_bytes(32),

    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '60 seconds'
);

-- useful if periodically cleaning expired challenges
CREATE INDEX idx_webauthn_challenges_expires_at
    ON webauthn_challenges(expires_at);