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
