GRANT SELECT, INSERT
ON users
TO identity_api;

GRANT SELECT, INSERT, DELETE
ON operators
TO identity_api;

GRANT SELECT, INSERT, UPDATE
ON passkey_credentials,
   session_refresh_tokens
TO identity_api;

GRANT SELECT, INSERT, UPDATE, DELETE
ON sessions
TO identity_api;

GRANT SELECT, INSERT, DELETE
ON challenges
TO identity_api;
