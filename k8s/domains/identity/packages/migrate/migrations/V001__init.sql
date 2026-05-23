-- Default grants for future Flyway objects.
ALTER DEFAULT PRIVILEGES
FOR ROLE identity_migrator
IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLES TO identity_runtime;

ALTER DEFAULT PRIVILEGES
FOR ROLE identity_migrator
IN SCHEMA public
GRANT USAGE, SELECT
ON SEQUENCES TO identity_runtime;

--

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY
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
