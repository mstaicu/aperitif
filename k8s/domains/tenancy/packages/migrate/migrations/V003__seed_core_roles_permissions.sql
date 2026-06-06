INSERT INTO permissions (id)
VALUES
    ('members.manage')
ON CONFLICT (id) DO NOTHING;

INSERT INTO roles (id, name)
VALUES
    ('owner', 'Owner'),
    ('member', 'Member')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO role_permissions (role_id, permission_id)
VALUES
    ('owner', 'members.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;
