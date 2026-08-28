CREATE TABLE plans (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL CHECK (
        char_length(name) > 0
    )
);

CREATE TABLE features (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL CHECK (
        char_length(name) > 0
    )
);

CREATE TABLE plan_features (
    plan_id TEXT NOT NULL
        REFERENCES plans(id)
        ON DELETE CASCADE,

    feature_id TEXT NOT NULL
        REFERENCES features(id),

    value JSONB NOT NULL CHECK (
        jsonb_typeof(value) IN ('boolean', 'number', 'string')
    ),

    PRIMARY KEY (plan_id, feature_id)
);

CREATE TABLE account_plans (
    account_id UUID PRIMARY KEY,

    plan_id TEXT NOT NULL
        REFERENCES plans(id),

    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0)
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

-- Notification only; the row remains durable until JetStream acknowledges it.
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
