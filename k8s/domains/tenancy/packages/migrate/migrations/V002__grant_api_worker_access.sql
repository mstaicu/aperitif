GRANT SELECT, INSERT, UPDATE
ON tenants
TO tenancy_api;

GRANT SELECT
ON permissions,
   roles,
   role_permissions
TO tenancy_api;

GRANT SELECT, INSERT, UPDATE, DELETE
ON tenant_memberships
TO tenancy_api;

GRANT INSERT
ON outbox_events
TO tenancy_api;

GRANT SELECT, UPDATE
ON outbox_events
TO tenancy_worker;
