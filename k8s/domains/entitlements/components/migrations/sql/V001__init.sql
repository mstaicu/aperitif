CREATE TABLE capabilities (
    id TEXT PRIMARY KEY,

    type TEXT NOT NULL CHECK (
        type IN ('boolean', 'number')
    ),

    strategy TEXT NOT NULL CHECK (
        strategy IN ('boolean_or', 'number_max', 'number_sum')
    ),

    CHECK (
        (type = 'boolean' AND strategy = 'boolean_or')
        OR
        (type = 'number' AND strategy IN ('number_max', 'number_sum'))
    )
);

CREATE TABLE projected_accounts (
    account_id UUID PRIMARY KEY,

    version BIGINT NOT NULL CHECK (version > 0)
);

CREATE TABLE grants (
    account_id UUID NOT NULL
        REFERENCES projected_accounts(account_id),

    grant_id UUID NOT NULL,

    capability_id TEXT NOT NULL
        REFERENCES capabilities(id),

    value JSONB NOT NULL CHECK (
        jsonb_typeof(value) IN ('boolean', 'number')
    ),

    PRIMARY KEY (account_id, grant_id, capability_id)
);

CREATE SEQUENCE account_entitlements_version_seq AS BIGINT;

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
