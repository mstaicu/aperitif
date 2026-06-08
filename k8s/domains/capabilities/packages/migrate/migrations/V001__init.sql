CREATE TABLE capabilities (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    value_type TEXT NOT NULL CHECK (
        value_type IN ('boolean', 'number')
    ),

    merge_strategy TEXT NOT NULL CHECK (
        merge_strategy IN ('boolean_or', 'number_max', 'number_sum')
    ),

    CHECK (
        (value_type = 'boolean' AND merge_strategy = 'boolean_or')
        OR
        (value_type = 'number' AND merge_strategy IN ('number_max', 'number_sum'))
    )
);

CREATE TABLE account_capability_grants (
    account_id UUID NOT NULL,

    grant_id UUID NOT NULL,

    capability_id TEXT NOT NULL
        REFERENCES capabilities(id),

    value JSONB NOT NULL,

    PRIMARY KEY (account_id, grant_id, capability_id)
);

CREATE SEQUENCE account_capabilities_version_seq AS BIGINT;

CREATE TABLE projected_accounts (
    account_id UUID PRIMARY KEY,

    version BIGINT NOT NULL
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,

    event JSONB NOT NULL,

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
