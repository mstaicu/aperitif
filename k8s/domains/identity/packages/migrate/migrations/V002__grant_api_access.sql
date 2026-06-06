GRANT SELECT, INSERT
ON users
TO identity_api;

GRANT SELECT
ON operator_permissions,
   operator_roles,
   operator_role_permissions
TO identity_api;

GRANT SELECT, INSERT, DELETE
ON operator_users
TO identity_api;

GRANT SELECT, INSERT, UPDATE
ON passkey_credentials,
   sessions,
   session_refresh_tokens
TO identity_api;

GRANT SELECT, INSERT, DELETE
ON challenges
TO identity_api;
