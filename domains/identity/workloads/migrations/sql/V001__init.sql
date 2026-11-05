CREATE TABLE principals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    name text NOT NULL
        CHECK (char_length(name) BETWEEN 1 AND 160),

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    version bigint NOT NULL DEFAULT 1
        CHECK (version BETWEEN 1 AND 9007199254740991)
);

CREATE TABLE account_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id uuid NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    principal_id uuid NOT NULL
        REFERENCES principals(id)
        ON DELETE CASCADE,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    version bigint NOT NULL DEFAULT 1
        CHECK (version BETWEEN 1 AND 9007199254740991),

    UNIQUE (account_id, principal_id)
);

CREATE TABLE roles (
    id text PRIMARY KEY
);

CREATE TABLE account_membership_roles (
    membership_id uuid NOT NULL
        REFERENCES account_memberships(id)
        ON DELETE CASCADE,

    role text NOT NULL
        REFERENCES roles(id),

    PRIMARY KEY (membership_id, role)
);

CREATE TABLE passkey_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    credential_id bytea NOT NULL UNIQUE,

    principal_id uuid NOT NULL
        REFERENCES principals(id)
        ON DELETE CASCADE,

    name text NOT NULL DEFAULT 'Passkey'
        CHECK (length(trim(name)) BETWEEN 1 AND 100),

    public_key bytea NOT NULL,

    sign_count bigint NOT NULL DEFAULT 0,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE passkey_registration_challenges (
    challenge bytea PRIMARY KEY,

    principal_id uuid NOT NULL,

    expires_at timestamptz NOT NULL
        DEFAULT now() + INTERVAL '2 minutes'
);

CREATE TABLE passkey_authentication_challenges (
    challenge bytea PRIMARY KEY,

    expires_at timestamptz NOT NULL
        DEFAULT now() + INTERVAL '2 minutes'
);

CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    principal_id uuid NOT NULL
        REFERENCES principals(id)
        ON DELETE CASCADE,

    token_hash bytea NOT NULL UNIQUE,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

    expires_at timestamptz NOT NULL
);

CREATE TABLE outbox_messages (
    id uuid PRIMARY KEY,

    subject text NOT NULL
        CHECK (subject <> ''),

    payload jsonb NOT NULL,

    headers jsonb NOT NULL DEFAULT '{}'
        CHECK (jsonb_typeof(headers) = 'object')
);

-- Separate ceremony contexts prevent a login or signup proof authorizing credential changes.
CREATE TABLE passkey_addition_challenges (
    authentication_challenge bytea PRIMARY KEY,
    registration_challenge bytea NOT NULL UNIQUE,
    session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL DEFAULT now() + INTERVAL '2 minutes'
);

CREATE TABLE passkey_removal_challenges (
    challenge bytea PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    credential_id uuid NOT NULL REFERENCES passkey_credentials(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL DEFAULT now() + INTERVAL '2 minutes'
);
