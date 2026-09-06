CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    type TEXT NOT NULL CHECK (
        type IN ('individual', 'organization')
    ),

    name TEXT NOT NULL CHECK (
        char_length(name) BETWEEN 1 AND 160
    ),

    version BIGINT NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 9007199254740991)
);

CREATE TABLE account_members (
    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    PRIMARY KEY (account_id, user_id)
);

CREATE TABLE account_member_roles (
    account_id UUID NOT NULL,

    user_id UUID NOT NULL,

    role TEXT NOT NULL CHECK (role = 'owner'),

    PRIMARY KEY (account_id, user_id, role),

    FOREIGN KEY (account_id, user_id)
        REFERENCES account_members(account_id, user_id)
        ON DELETE CASCADE
);

CREATE TABLE outbox_messages (
    id UUID PRIMARY KEY,

    subject TEXT NOT NULL CHECK (subject <> ''),

    payload JSONB NOT NULL,

    headers JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(headers) = 'object'),

    queued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX outbox_messages_queued_at_id
ON outbox_messages (queued_at, id);
