CREATE EXTENSION "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email TEXT NOT NULL UNIQUE
        CHECK (email = lower(btrim(email)))
);

CREATE TABLE operators (
    user_id UUID PRIMARY KEY
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE passkey_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    credential_id BYTEA NOT NULL UNIQUE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    public_key BYTEA NOT NULL,

    sign_count BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE registration_challenges (
    challenge BYTEA PRIMARY KEY,

    user_id UUID NOT NULL,

    email TEXT NOT NULL UNIQUE
        CHECK (email = lower(btrim(email))),

    expires_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW() + INTERVAL '2 minutes'
);

CREATE TABLE authentication_challenges (
    challenge BYTEA PRIMARY KEY,

    expires_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW() + INTERVAL '2 minutes'
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ
);

CREATE TABLE session_refresh_tokens (
    token_hash BYTEA PRIMARY KEY,

    session_id UUID NOT NULL
        REFERENCES sessions(id)
        ON DELETE CASCADE,

    consumed_at TIMESTAMPTZ
);
