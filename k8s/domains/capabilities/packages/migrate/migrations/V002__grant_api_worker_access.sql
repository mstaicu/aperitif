GRANT SELECT
ON capabilities
TO capabilities_api;

GRANT SELECT, INSERT, DELETE
ON account_capability_grants
TO capabilities_api;

GRANT SELECT, UPDATE
ON projected_accounts
TO capabilities_api;

GRANT INSERT
ON outbox_events
TO capabilities_api;

GRANT USAGE, SELECT
ON SEQUENCE account_capabilities_version_seq
TO capabilities_api;

GRANT SELECT, INSERT, UPDATE
ON projected_accounts
TO capabilities_worker;

GRANT SELECT, UPDATE
ON outbox_events
TO capabilities_worker;
