CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    type TEXT NOT NULL CHECK (
        type IN ('individual', 'organization')
    ),

    name TEXT NOT NULL CHECK (
        char_length(name) BETWEEN 1 AND 160
    ),

    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE account_members (
    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    role TEXT NOT NULL CHECK (
        role IN ('owner', 'member')
    ),

    PRIMARY KEY (account_id, user_id)
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,

    subject TEXT NOT NULL CHECK (subject <> ''),

    event JSONB NOT NULL CHECK (
        jsonb_typeof(event) = 'object'
        AND COALESCE(event->>'id', '') = id::text
        AND COALESCE(event->>'type', '') <> ''
    ),

    traceparent TEXT,

    tracestate TEXT,

    queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        tracestate IS NULL OR traceparent IS NOT NULL
    )
);

CREATE INDEX outbox_events_queued_at_id
ON outbox_events (queued_at, id);
