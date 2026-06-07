CREATE EXTENSION "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY
);

CREATE TABLE operator_permissions (
    id TEXT PRIMARY KEY
);

CREATE TABLE operator_roles (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL
);

CREATE TABLE operator_role_permissions (
    role_id TEXT NOT NULL
        REFERENCES operator_roles(id)
        ON DELETE CASCADE,

    permission_id TEXT NOT NULL
        REFERENCES operator_permissions(id)
        ON DELETE CASCADE,

    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE operator_users (
    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    role_id TEXT NOT NULL
        REFERENCES operator_roles(id)
        ON DELETE CASCADE,

    PRIMARY KEY (user_id, role_id)
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
