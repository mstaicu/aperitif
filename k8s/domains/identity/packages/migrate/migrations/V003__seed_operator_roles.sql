INSERT INTO operator_permissions (id)
VALUES
    ('operators.manage'),
    ('accounts.manage'),
    ('capabilities.grant'),
    ('capabilities.revoke');

INSERT INTO operator_roles (id, name)
VALUES
    ('operator', 'Operator');

INSERT INTO operator_role_permissions (role_id, permission_id)
SELECT 'operator', id
FROM operator_permissions
WHERE id IN (
    'operators.manage',
    'accounts.manage',
    'capabilities.grant',
    'capabilities.revoke'
);
