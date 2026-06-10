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
);