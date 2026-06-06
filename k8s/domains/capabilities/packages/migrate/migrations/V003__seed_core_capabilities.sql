INSERT INTO capabilities (
    id,
    name,
    value_type,
    merge_strategy
)
VALUES
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
    )
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    value_type = EXCLUDED.value_type,
    merge_strategy = EXCLUDED.merge_strategy;
