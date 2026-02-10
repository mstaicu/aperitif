-- Up Migration

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    credential_id BYTEA NOT NULL UNIQUE,
    public_key BYTEA NOT NULL,

    sign_count BIGINT NOT NULL DEFAULT 0,

    algorithm TEXT NOT NULL
        CHECK (algorithm IN ('RS256', 'ES256', 'EdDSA')),

    credential_type TEXT NOT NULL DEFAULT 'public-key',

    transports TEXT[],

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webauthn_credentials_user_id
    ON webauthn_credentials(user_id);

CREATE TABLE webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID,

    value BYTEA NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_webauthn_challenges_expires_at
    ON webauthn_challenges(expires_at);

-- Down Migration