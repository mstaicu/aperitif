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
COMMENT ON COLUMN product_prices.status IS 'Draft prices are not sellable; active prices can be shown to clients.';

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

    name TEXT NOT NULL,

    kind TEXT NOT NULL CHECK (kind IN ('personal', 'organization')),

    status TEXT NOT NULL CHECK (status IN ('pending', 'active')),

    tenant_version BIGINT NOT NULL,

    projected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenant_projection IS 'Local projection of tenancy-owned tenant authority used by the features domain.';
COMMENT ON COLUMN tenant_projection.tenant_id IS 'Tenant id owned by the tenancy domain.';
COMMENT ON COLUMN tenant_projection.name IS 'Projected tenant name from tenancy events.';
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
