-- Local/CI placeholder bootstrap. The official Postgres image runs this once
-- when the data directory is empty. Managed production should run an equivalent
-- bootstrap with real passwords outside the in-cluster Postgres unit.
-- Mirror role/grant changes in packages/database/bootstrap/managed-postgres.sql.

CREATE ROLE documents_migrator;
CREATE ROLE documents_runtime;
CREATE ROLE documents_api;
CREATE ROLE documents_worker;

ALTER ROLE documents_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

ALTER ROLE documents_runtime
WITH NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

ALTER ROLE documents_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

ALTER ROLE documents_worker
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

GRANT documents_runtime TO documents_api;
GRANT documents_runtime TO documents_worker;

REVOKE CONNECT, TEMPORARY ON DATABASE documents FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE documents
TO documents_migrator;

GRANT CONNECT
ON DATABASE documents
TO documents_runtime;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO documents_migrator;

GRANT USAGE
ON SCHEMA public
TO documents_runtime;
