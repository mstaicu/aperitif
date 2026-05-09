INSERT INTO features (
    feature_key,
    name,
    value_type,
    merge_strategy,
    status
)
VALUES
    ('clients.unlimited', 'Unlimited clients', 'boolean', 'boolean_or', 'active'),
    ('custom_intake.branding', 'Custom intake branding', 'boolean', 'boolean_or', 'active'),
    ('onboarding.call', 'Onboarding call', 'boolean', 'boolean_or', 'active'),
    ('priority.support', 'Priority support', 'boolean', 'boolean_or', 'active'),
    ('revenue.summary', 'Revenue summary', 'boolean', 'boolean_or', 'active'),
    ('stylists.max', 'Maximum stylists', 'number', 'number_max', 'active'),
    ('team.performance', 'Team performance', 'boolean', 'boolean_or', 'active'),
    ('whatsapp.prompts', 'WhatsApp prompts', 'boolean', 'boolean_or', 'active');

INSERT INTO products (
    product_code,
    name,
    product_type,
    status
)
VALUES
    ('starter', 'Starter', 'plan', 'active'),
    ('studio', 'Studio', 'plan', 'active');

INSERT INTO product_features (
    product_code,
    feature_key,
    granted_value
)
VALUES
    ('starter', 'clients.unlimited', 'true'::jsonb),
    ('starter', 'custom_intake.branding', 'true'::jsonb),
    ('starter', 'revenue.summary', 'true'::jsonb),
    ('starter', 'stylists.max', '5'::jsonb),
    ('starter', 'whatsapp.prompts', 'true'::jsonb),

    ('studio', 'clients.unlimited', 'true'::jsonb),
    ('studio', 'custom_intake.branding', 'true'::jsonb),
    ('studio', 'onboarding.call', 'true'::jsonb),
    ('studio', 'priority.support', 'true'::jsonb),
    ('studio', 'revenue.summary', 'true'::jsonb),
    ('studio', 'stylists.max', '999'::jsonb),
    ('studio', 'team.performance', 'true'::jsonb),
    ('studio', 'whatsapp.prompts', 'true'::jsonb);

INSERT INTO product_prices (
    price_code,
    product_code,
    provider,
    provider_price_ref,
    billing_type,
    billing_period_unit,
    billing_period_count,
    amount_minor,
    currency_code,
    status
)
VALUES
    (
        'starter.manual.monthly.usd',
        'starter',
        'manual',
        'starter.manual.monthly.usd',
        'recurring',
        'month',
        1,
        3000,
        'USD',
        'active'
    ),
    (
        'studio.manual.monthly.usd',
        'studio',
        'manual',
        'studio.manual.monthly.usd',
        'recurring',
        'month',
        1,
        7900,
        'USD',
        'active'
    );
