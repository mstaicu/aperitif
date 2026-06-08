INSERT INTO permissions (id)
VALUES
    ('members.manage');

INSERT INTO roles (id, name)
VALUES
    ('owner', 'Owner'),
    ('member', 'Member');

INSERT INTO role_permissions (role_id, permission_id)
VALUES
    ('owner', 'members.manage');
