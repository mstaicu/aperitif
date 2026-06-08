GRANT SELECT, INSERT
ON documents
TO documents_api;

GRANT SELECT
ON projected_account_members,
   projected_account_capabilities
TO documents_api;

GRANT SELECT, INSERT, UPDATE
ON projected_account_members,
   projected_account_capabilities
TO documents_worker;
