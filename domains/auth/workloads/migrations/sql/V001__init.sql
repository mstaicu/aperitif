CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE passkey_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    credential_id bytea NOT NULL UNIQUE,

    user_id uuid NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name text NOT NULL DEFAULT 'Passkey'
        CHECK (length(trim(name)) BETWEEN 1 AND 100),

    public_key bytea NOT NULL,

    sign_count bigint NOT NULL DEFAULT 0,

    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX passkey_credentials_user_id_idx
    ON passkey_credentials (user_id);

CREATE TABLE registration_challenges (
    challenge bytea PRIMARY KEY,

    user_id uuid NOT NULL,

    expires_at timestamptz NOT NULL
        DEFAULT now() + INTERVAL '2 minutes'
);

CREATE TABLE authentication_challenges (
    challenge bytea PRIMARY KEY,

    expires_at timestamptz NOT NULL
        DEFAULT now() + INTERVAL '2 minutes'
);

CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash bytea NOT NULL UNIQUE,

    expires_at timestamptz NOT NULL,

    revoked_at timestamptz
);
