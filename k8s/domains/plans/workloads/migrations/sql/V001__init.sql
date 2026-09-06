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

    version BIGINT NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 9007199254740991)
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
