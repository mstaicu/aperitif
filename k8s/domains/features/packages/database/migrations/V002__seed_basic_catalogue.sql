INSERT INTO feature_definitions (
    code,
    name,
    type,
    merge_strategy
)
VALUES
    ('members.max', 'Maximum Members', 'number', 'number_max'),
    ('workspaces.max', 'Maximum Workspaces', 'number', 'number_max'),
    ('api.requests.monthly', 'Monthly API Requests', 'number', 'number_max'),
    ('storage.gb', 'Storage Allowance', 'number', 'number_sum'),
    ('exports.enabled', 'Exports Enabled', 'boolean', 'boolean_or');

INSERT INTO products (
    code,
    name
)
VALUES
    ('starter', 'Starter'),
    ('pro', 'Pro');

INSERT INTO product_features (
    product_code,
    feature_code,
    value
)
VALUES
    ('starter', 'members.max', '5'::jsonb),
    ('starter', 'workspaces.max', '1'::jsonb),
    ('starter', 'api.requests.monthly', '10000'::jsonb),
    ('starter', 'storage.gb', '10'::jsonb),
    ('starter', 'exports.enabled', 'false'::jsonb),
    ('pro', 'members.max', '25'::jsonb),
    ('pro', 'workspaces.max', '5'::jsonb),
    ('pro', 'api.requests.monthly', '100000'::jsonb),
    ('pro', 'storage.gb', '100'::jsonb),
    ('pro', 'exports.enabled', 'true'::jsonb);

INSERT INTO product_offers (
    code,
    product_code,
    amount_minor
)
VALUES
    ('starter.monthly', 'starter', 3000),
    ('pro.monthly', 'pro', 7900);
