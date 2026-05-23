INSERT INTO capabilities (
    id,
    name,
    value_type,
    merge_strategy
)
VALUES
    (
        'documents.enabled',
        'Documents Enabled',
        'boolean',
        'boolean_or'
    ),
    (
        'members.max',
        'Maximum Members',
        'number',
        'number_max'
    ),
    (
        'storage.gb',
        'Storage GB',
        'number',
        'number_sum'
    );
