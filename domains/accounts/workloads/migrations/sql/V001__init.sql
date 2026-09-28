CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL CHECK (
        char_length(name) BETWEEN 1 AND 160
    ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    version BIGINT NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 9007199254740991)
);

CREATE TABLE account_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    subject_id TEXT NOT NULL CHECK (subject_id <> ''),

    role TEXT NOT NULL CHECK (
        role IN ('owner', 'admin', 'member')
    ),

    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'inactive')
    ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    version BIGINT NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 9007199254740991),

    UNIQUE (account_id, subject_id)
);

CREATE INDEX account_memberships_subject_id_account_id
ON account_memberships (subject_id, account_id);

CREATE TABLE outbox_messages (
    id UUID PRIMARY KEY,

    subject TEXT NOT NULL CHECK (subject <> ''),

    payload JSONB NOT NULL,

    headers JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(headers) = 'object'),

    queued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX outbox_messages_queued_at_id
ON outbox_messages (queued_at, id);
