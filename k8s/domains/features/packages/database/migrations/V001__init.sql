CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE features (
    feature_key TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    value_type TEXT NOT NULL CHECK (
        value_type IN ('boolean', 'number', 'string', 'json')
    ),

    merge_strategy TEXT NOT NULL CHECK (
        merge_strategy IN ('boolean_or', 'number_max', 'number_sum')
    ),

    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'archived')
    )
);

COMMENT ON TABLE features IS 'Vocabulary of product features that can be granted to tenants.';
COMMENT ON COLUMN features.feature_key IS 'Stable internal feature key used by product code, for example members.max.';
COMMENT ON COLUMN features.name IS 'Human-readable feature name.';
COMMENT ON COLUMN features.value_type IS 'Expected JSON value type for grants of this feature.';
COMMENT ON COLUMN features.merge_strategy IS 'Rule used later to merge multiple active tenant grants for this feature.';
COMMENT ON COLUMN features.status IS 'Lifecycle status for catalogue management.';

CREATE TABLE products (
    product_code TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    product_type TEXT NOT NULL CHECK (
        product_type IN ('plan', 'addon', 'top_up')
    ),

    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'archived')
    )
);

COMMENT ON TABLE products IS 'Local products a tenant can acquire, such as a plan, add-on, or top-up.';
COMMENT ON COLUMN products.product_code IS 'Stable local product code. This is not a payment-provider product id.';
COMMENT ON COLUMN products.name IS 'Human-readable product name.';
COMMENT ON COLUMN products.product_type IS 'Commercial/access shape of the product.';
COMMENT ON COLUMN products.status IS 'Lifecycle status for catalogue management.';

CREATE TABLE product_features (
    product_code TEXT NOT NULL
        REFERENCES products(product_code)
        ON DELETE CASCADE,

    feature_key TEXT NOT NULL
        REFERENCES features(feature_key),

    granted_value JSONB NOT NULL,

    PRIMARY KEY (product_code, feature_key)
);

COMMENT ON TABLE product_features IS 'Feature values included in each product catalogue template.';
COMMENT ON COLUMN product_features.product_code IS 'Product that includes this feature value.';
COMMENT ON COLUMN product_features.feature_key IS 'Feature included by the product.';
COMMENT ON COLUMN product_features.granted_value IS 'JSON value granted by this product for this feature.';

CREATE TABLE product_prices (
    price_code TEXT PRIMARY KEY,

    product_code TEXT NOT NULL
        REFERENCES products(product_code),

    provider TEXT NOT NULL,

    provider_price_ref TEXT,

    billing_type TEXT NOT NULL CHECK (
        billing_type IN ('recurring', 'one_time')
    ),

    billing_period_unit TEXT CHECK (
        billing_period_unit IN ('day', 'week', 'month', 'year')
    ),

    billing_period_count INTEGER,

    amount_minor INTEGER,

    currency_code TEXT,

    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'active', 'archived')
    )
);

COMMENT ON TABLE product_prices IS 'Provider-specific ways to sell or acquire a local product.';
COMMENT ON COLUMN product_prices.price_code IS 'Stable local price code. This is not a payment-provider price id.';
COMMENT ON COLUMN product_prices.product_code IS 'Local product this price sells.';
COMMENT ON COLUMN product_prices.provider IS 'Provider key, such as stripe, paystack, adyen, or manual.';
COMMENT ON COLUMN product_prices.provider_price_ref IS 'Provider-side price, plan, or offer reference.';
COMMENT ON COLUMN product_prices.billing_type IS 'Whether this price is recurring or one-time.';
COMMENT ON COLUMN product_prices.billing_period_unit IS 'Recurring billing period unit.';
COMMENT ON COLUMN product_prices.billing_period_count IS 'Number of billing period units per cycle.';
COMMENT ON COLUMN product_prices.amount_minor IS 'Price amount in minor currency units.';
COMMENT ON COLUMN product_prices.currency_code IS 'ISO-style three-letter currency code.';
COMMENT ON COLUMN product_prices.status IS 'Draft prices are not sellable; active prices can be shown by the API.';

CREATE UNIQUE INDEX product_prices_provider_price_ref_unique
ON product_prices (provider, provider_price_ref)
WHERE provider_price_ref IS NOT NULL;

CREATE INDEX product_features_feature_key_idx
ON product_features (feature_key);

CREATE INDEX product_prices_product_code_idx
ON product_prices (product_code);

CREATE INDEX product_prices_status_idx
ON product_prices (status);

CREATE TABLE tenant_projection (
    tenant_id UUID PRIMARY KEY,

    kind TEXT NOT NULL CHECK (kind IN ('personal', 'organization')),

    status TEXT NOT NULL CHECK (status IN ('active', 'archived')),

    tenant_version BIGINT NOT NULL,

    projected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenant_projection IS 'Local projection of tenancy-owned tenant authority used by the features domain.';
COMMENT ON COLUMN tenant_projection.tenant_id IS 'Tenant id owned by the tenancy domain.';
COMMENT ON COLUMN tenant_projection.kind IS 'Projected tenant kind from tenancy events.';
COMMENT ON COLUMN tenant_projection.status IS 'Projected tenant lifecycle status from tenancy events.';
COMMENT ON COLUMN tenant_projection.tenant_version IS 'Latest tenancy authority version applied to this projected tenant.';
COMMENT ON COLUMN tenant_projection.projected_at IS 'Time this projection row was last updated locally.';

CREATE TABLE tenant_membership_projection (
    tenant_id UUID NOT NULL
        REFERENCES tenant_projection(tenant_id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    role TEXT CHECK (role IN ('owner', 'member')),

    status TEXT NOT NULL CHECK (status IN ('active', 'deleted')),

    tenant_version BIGINT NOT NULL,

    projected_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, user_id)
);

COMMENT ON TABLE tenant_membership_projection IS 'Local projection of tenancy-owned tenant memberships used by the features domain.';
COMMENT ON COLUMN tenant_membership_projection.tenant_id IS 'Tenant id owned by the tenancy domain.';
COMMENT ON COLUMN tenant_membership_projection.user_id IS 'Identity user id projected from tenancy membership events.';
COMMENT ON COLUMN tenant_membership_projection.role IS 'Projected tenant role when the membership is active.';
COMMENT ON COLUMN tenant_membership_projection.status IS 'Projection row status. Deleted rows are tombstones for stale-event protection.';
COMMENT ON COLUMN tenant_membership_projection.tenant_version IS 'Tenancy authority version that last changed this projected membership.';
COMMENT ON COLUMN tenant_membership_projection.projected_at IS 'Time this projection row was last updated locally.';

CREATE INDEX tenant_membership_projection_user_id_idx
ON tenant_membership_projection (user_id)
WHERE status = 'active';

CREATE TABLE tenant_feature_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id UUID NOT NULL,

    feature_key TEXT NOT NULL
        REFERENCES features(feature_key),

    granted_value JSONB NOT NULL,

    source_type TEXT NOT NULL,

    source_ref TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'revoked')
    ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

COMMENT ON TABLE tenant_feature_grants IS 'Inputs that grant feature values to a tenant, such as products, admin grants, or future provider confirmations.';
COMMENT ON COLUMN tenant_feature_grants.id IS 'Stable grant id.';
COMMENT ON COLUMN tenant_feature_grants.tenant_id IS 'Tenant receiving this feature grant.';
COMMENT ON COLUMN tenant_feature_grants.feature_key IS 'Feature granted to the tenant.';
COMMENT ON COLUMN tenant_feature_grants.granted_value IS 'JSON feature value contributed by this grant.';
COMMENT ON COLUMN tenant_feature_grants.source_type IS 'Local source category for the grant, for example product or manual.';
COMMENT ON COLUMN tenant_feature_grants.source_ref IS 'Stable source reference inside the source category.';
COMMENT ON COLUMN tenant_feature_grants.status IS 'Active grants are used to compute tenant_features; revoked grants remain for history.';
COMMENT ON COLUMN tenant_feature_grants.created_at IS 'Time the grant was recorded.';
COMMENT ON COLUMN tenant_feature_grants.revoked_at IS 'Time the grant was revoked, when applicable.';

CREATE INDEX tenant_feature_grants_tenant_feature_idx
ON tenant_feature_grants (tenant_id, feature_key)
WHERE status = 'active';

CREATE INDEX tenant_feature_grants_source_idx
ON tenant_feature_grants (source_type, source_ref);

CREATE UNIQUE INDEX tenant_feature_grants_active_source_feature_unique
ON tenant_feature_grants (tenant_id, feature_key, source_type, source_ref)
WHERE status = 'active';

CREATE TABLE tenant_features (
    tenant_id UUID NOT NULL,

    feature_key TEXT NOT NULL
        REFERENCES features(feature_key),

    value JSONB NOT NULL,

    value_type TEXT NOT NULL CHECK (
        value_type IN ('boolean', 'number', 'string', 'json')
    ),

    features_version BIGINT NOT NULL,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (tenant_id, feature_key)
);

COMMENT ON TABLE tenant_features IS 'Current effective feature values for each tenant. Events are emitted from this authority table.';
COMMENT ON COLUMN tenant_features.tenant_id IS 'Tenant that owns this effective feature value.';
COMMENT ON COLUMN tenant_features.feature_key IS 'Effective feature key.';
COMMENT ON COLUMN tenant_features.value IS 'Current effective JSON feature value after active grants are merged.';
COMMENT ON COLUMN tenant_features.value_type IS 'Projected value type from features for consumers.';
COMMENT ON COLUMN tenant_features.features_version IS 'Monotonic authority version assigned when this tenant feature value changes.';
COMMENT ON COLUMN tenant_features.updated_at IS 'Time this effective feature value was last changed.';

CREATE INDEX tenant_features_feature_key_idx
ON tenant_features (feature_key);

CREATE SEQUENCE features_version_seq AS BIGINT;

COMMENT ON SEQUENCE features_version_seq IS 'Monotonic authority version assigned to features-domain events.';

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    subject TEXT NOT NULL,

    tenant_id UUID NOT NULL,

    features_version BIGINT NOT NULL,

    schema_version INTEGER NOT NULL,

    payload JSONB NOT NULL,

    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,

    CONSTRAINT outbox_events_schema_version_positive CHECK (schema_version > 0)
);

COMMENT ON TABLE outbox_events IS 'Transactional outbox for durable features-domain events waiting to be published to the event bus.';
COMMENT ON COLUMN outbox_events.id IS 'Stable event id used by consumers for idempotency.';
COMMENT ON COLUMN outbox_events.subject IS 'Event bus subject, for example features.tenant_features.updated.';
COMMENT ON COLUMN outbox_events.tenant_id IS 'Tenant whose features changed.';
COMMENT ON COLUMN outbox_events.features_version IS 'Features authority version consumers use to reject stale or out-of-order feature events.';
COMMENT ON COLUMN outbox_events.schema_version IS 'Event payload schema version used by consumers to select the correct decoder.';
COMMENT ON COLUMN outbox_events.payload IS 'JSON event body published to the event bus.';
COMMENT ON COLUMN outbox_events.occurred_at IS 'Time the domain event was recorded in the same transaction as the state change.';
COMMENT ON COLUMN outbox_events.published_at IS 'Null until a worker successfully publishes the event.';

-- Wake workers once after an INSERT statement adds outbox rows.
-- This is only a notification signal; outbox_events remains the durable source.
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

COMMENT ON FUNCTION notify_outbox_event() IS 'Sends a lightweight Postgres notification after an INSERT statement adds outbox rows. Workers must still query outbox_events because notifications are not durable.';

CREATE INDEX outbox_events_unpublished_idx
ON outbox_events (occurred_at, features_version, id)
WHERE published_at IS NULL;

COMMENT ON INDEX outbox_events_unpublished_idx IS 'Keeps worker scans cheap by indexing only unpublished outbox rows in publish order.';

-- Runtime roles are created by the placeholder Postgres init SQL. Flyway
-- creates the schema objects, so object-level runtime grants live here.
GRANT USAGE
ON SCHEMA public
TO features_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO features_runtime;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO features_runtime;

-- Future tables/sequences created by features_migrator should automatically
-- be usable by features_runtime without repeating grants in every migration.
ALTER DEFAULT PRIVILEGES
FOR ROLE features_migrator
IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLES TO features_runtime;

ALTER DEFAULT PRIVILEGES
FOR ROLE features_migrator
IN SCHEMA public
GRANT USAGE, SELECT
ON SEQUENCES TO features_runtime;
