CREATE EXTENSION "pgcrypto";

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    type TEXT NOT NULL CHECK (
        type IN ('personal', 'business')
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

    event JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    published_at TIMESTAMPTZ
);

-- Notification only; outbox_events remains durable.
CREATE FUNCTION notify_outbox_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('outbox_events', '');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outbox_events_notify_insert
AFTER INSERT ON outbox_events
FOR EACH STATEMENT
EXECUTE FUNCTION notify_outbox_event();
