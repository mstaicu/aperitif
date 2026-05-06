DROP INDEX IF EXISTS outbox_events_unpublished_idx;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'outbox_events'
          AND column_name = 'version'
    ) THEN
        ALTER TABLE outbox_events
        RENAME COLUMN version TO tenant_version;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'outbox_events'
          AND column_name = 'producer'
    ) THEN
        ALTER TABLE outbox_events
        DROP COLUMN producer;
    END IF;
END;
$$;

COMMENT ON COLUMN outbox_events.tenant_version IS 'Tenant authority version consumers use to reject stale or out-of-order events.';

CREATE INDEX IF NOT EXISTS outbox_events_unpublished_idx
ON outbox_events (occurred_at, tenant_version, id)
WHERE published_at IS NULL;
