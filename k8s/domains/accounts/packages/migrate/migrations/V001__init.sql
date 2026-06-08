CREATE EXTENSION "pgcrypto";

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    version BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE permissions (
    id TEXT PRIMARY KEY
);

CREATE TABLE roles (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL
);

CREATE TABLE role_permissions (
    role_id TEXT NOT NULL
        REFERENCES roles(id)
        ON DELETE CASCADE,

    permission_id TEXT NOT NULL
        REFERENCES permissions(id)
        ON DELETE CASCADE,

    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE account_members (
    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    role_id TEXT NOT NULL
        REFERENCES roles(id),

    PRIMARY KEY (account_id, user_id)
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
