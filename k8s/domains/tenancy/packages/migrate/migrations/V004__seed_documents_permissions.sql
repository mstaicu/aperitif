INSERT INTO permissions (id)
VALUES
    ('documents.read'),
    ('documents.create');

INSERT INTO role_permissions (role_id, permission_id)
VALUES
    ('owner', 'documents.read'),
    ('owner', 'documents.create'),
    ('member', 'documents.read');
