CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE passkey_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    credential_id BYTEA NOT NULL UNIQUE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL DEFAULT 'Passkey'
        CHECK (LENGTH(TRIM(name)) BETWEEN 1 AND 100),

    public_key BYTEA NOT NULL,

    sign_count BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX passkey_credentials_user_id_idx
    ON passkey_credentials (user_id);

CREATE TABLE registration_challenges (
    challenge BYTEA PRIMARY KEY,

    user_id UUID NOT NULL,

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

    token_hash BYTEA NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ
);
