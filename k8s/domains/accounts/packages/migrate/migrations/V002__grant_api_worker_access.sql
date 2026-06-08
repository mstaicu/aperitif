GRANT SELECT, INSERT, UPDATE
ON accounts
TO accounts_api;

GRANT SELECT
ON permissions,
   roles,
   role_permissions
TO accounts_api;

GRANT SELECT, INSERT, UPDATE, DELETE
ON account_members
TO accounts_api;

GRANT INSERT
ON outbox_events
TO accounts_api;

GRANT SELECT, UPDATE
ON outbox_events
TO accounts_worker;
