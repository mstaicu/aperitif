INSERT INTO capabilities (
    id,
    name,
    value_type,
    merge_strategy
)
VALUES (
    'documents.enabled',
    'Documents Enabled',
    'boolean',
    'boolean_or'
)
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    value_type = EXCLUDED.value_type,
    merge_strategy = EXCLUDED.merge_strategy;
