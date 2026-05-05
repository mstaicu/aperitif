-- Local/CI placeholder bootstrap. The official Postgres image runs this once
-- when the data directory is empty. Managed production should run an equivalent
-- bootstrap with real passwords outside the in-cluster Postgres unit.
-- Mirror role/grant changes in packages/database/bootstrap/managed-postgres.sql.

CREATE ROLE identity_migrator;
CREATE ROLE identity_runtime;
CREATE ROLE identity_api;

ALTER ROLE identity_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

ALTER ROLE identity_runtime
WITH NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

ALTER ROLE identity_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

GRANT identity_runtime TO identity_api;

REVOKE CONNECT, TEMPORARY ON DATABASE identity FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE identity
TO identity_migrator;

GRANT CONNECT
ON DATABASE identity
TO identity_runtime;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO identity_migrator;

GRANT USAGE
ON SCHEMA public
TO identity_runtime;
