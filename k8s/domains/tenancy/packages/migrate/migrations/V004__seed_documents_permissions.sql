INSERT INTO permissions (id)
VALUES
    ('documents.read'),
    ('documents.create')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
VALUES
    ('owner', 'documents.read'),
    ('owner', 'documents.create'),
    ('member', 'documents.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

WITH affected_tenants AS (
    UPDATE tenants
    SET version = version + 1
    WHERE EXISTS (
        SELECT 1
        FROM tenant_memberships
        WHERE tenant_memberships.tenant_id = tenants.id
    )
    RETURNING id, version
),
member_snapshots AS (
    SELECT
        tm.tenant_id,
        tm.user_id,
        tm.role_id,
        at.version,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', rp.permission_id,
                    'value', true
                )
                ORDER BY rp.permission_id
            ) FILTER (WHERE rp.permission_id IS NOT NULL),
            '[]'::jsonb
        ) AS permissions
    FROM tenant_memberships tm
    JOIN affected_tenants at ON at.id = tm.tenant_id
    LEFT JOIN role_permissions rp ON rp.role_id = tm.role_id
    GROUP BY
        tm.tenant_id,
        tm.user_id,
        tm.role_id,
        at.version
),
events AS (
    SELECT
        gen_random_uuid() AS id,
        tenant_id,
        user_id,
        role_id,
        version,
        permissions
    FROM member_snapshots
)
INSERT INTO outbox_events (id, event)
SELECT
    id,
    jsonb_build_object(
        'id', id,
        'subject', 'tenancy.tenant_member.updated',
        'schema_version', 1,
        'version', version,
        'payload', jsonb_build_object(
            'tenant', jsonb_build_object(
                'id', tenant_id
            ),
            'member', jsonb_build_object(
                'tenant_id', tenant_id,
                'user_id', user_id,
                'role_id', role_id,
                'active', true
            ),
            'permissions', permissions
        )
    )
FROM events;
