GRANT SELECT, INSERT
ON documents
TO documents_api;

GRANT SELECT
ON projected_tenant_members,
   projected_tenant_capabilities
TO documents_api;

GRANT SELECT, INSERT, UPDATE
ON projected_tenant_members,
   projected_tenant_capabilities
TO documents_worker;
