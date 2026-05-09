-- Local/CI placeholder bootstrap. The official Postgres image runs this once
-- when the data directory is empty. Managed production should run an equivalent
-- bootstrap with real passwords outside the in-cluster Postgres unit.
-- Mirror role/grant changes in packages/database/bootstrap/managed-postgres.sql.

CREATE ROLE features_migrator;
CREATE ROLE features_runtime;
CREATE ROLE features_api;
CREATE ROLE features_worker;

ALTER ROLE features_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

ALTER ROLE features_runtime
WITH NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

ALTER ROLE features_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

ALTER ROLE features_worker
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

GRANT features_runtime TO features_api;
GRANT features_runtime TO features_worker;

REVOKE CONNECT, TEMPORARY ON DATABASE features FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE features
TO features_migrator;

GRANT CONNECT
ON DATABASE features
TO features_runtime;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO features_migrator;

GRANT USAGE
ON SCHEMA public
TO features_runtime;
