CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    name text NOT NULL
        CHECK (char_length(name) BETWEEN 1 AND 160),

    created_at timestamptz NOT NULL DEFAULT now(),

    version bigint NOT NULL DEFAULT 1
        CHECK (version BETWEEN 1 AND 9007199254740991)
);

CREATE TABLE account_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id uuid NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    user_id uuid NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    role text NOT NULL
        CHECK (role IN ('owner', 'admin', 'member')),

    status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    version bigint NOT NULL DEFAULT 1
        CHECK (version BETWEEN 1 AND 9007199254740991),

    UNIQUE (account_id, user_id)
);

CREATE INDEX account_memberships_user_id_account_id_idx
    ON account_memberships (user_id, account_id);

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

CREATE TABLE outbox_messages (
    id uuid PRIMARY KEY,

    subject text NOT NULL
        CHECK (subject <> ''),

    payload jsonb NOT NULL,

    headers jsonb NOT NULL DEFAULT '{}'
        CHECK (jsonb_typeof(headers) = 'object'),

    queued_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outbox_messages_queued_at_id_idx
    ON outbox_messages (queued_at, id);
