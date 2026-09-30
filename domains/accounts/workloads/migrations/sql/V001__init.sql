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

    subject_id text NOT NULL
        CHECK (subject_id <> ''),

    role text NOT NULL
        CHECK (role IN ('owner', 'admin', 'member')),

    status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    version bigint NOT NULL DEFAULT 1
        CHECK (version BETWEEN 1 AND 9007199254740991),

    UNIQUE (account_id, subject_id)
);

CREATE INDEX account_memberships_subject_id_account_id_idx
    ON account_memberships (subject_id, account_id);

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
