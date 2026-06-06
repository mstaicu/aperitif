INSERT INTO operator_permissions (id)
VALUES
    ('operators.manage'),
    ('tenants.manage'),
    ('capabilities.grant'),
    ('capabilities.revoke')
ON CONFLICT (id) DO NOTHING;

INSERT INTO operator_roles (id, name)
VALUES
    ('admin', 'Admin')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO operator_role_permissions (role_id, permission_id)
SELECT 'admin', id
FROM operator_permissions
WHERE id IN (
    'operators.manage',
    'tenants.manage',
    'capabilities.grant',
    'capabilities.revoke'
)
ON CONFLICT DO NOTHING;
