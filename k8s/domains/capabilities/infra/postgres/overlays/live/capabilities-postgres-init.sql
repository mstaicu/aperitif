-- Placeholder Postgres bootstrap. Keep roles/grants aligned with managed-postgres.sql.

CREATE ROLE capabilities_migrator;
CREATE ROLE capabilities_runtime;
CREATE ROLE capabilities_api;
CREATE ROLE capabilities_worker;

ALTER ROLE capabilities_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

ALTER ROLE capabilities_runtime
WITH NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

ALTER ROLE capabilities_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

ALTER ROLE capabilities_worker
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

GRANT capabilities_runtime TO capabilities_api;
GRANT capabilities_runtime TO capabilities_worker;

REVOKE CONNECT, TEMPORARY ON DATABASE capabilities FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE capabilities
TO capabilities_migrator;

GRANT CONNECT
ON DATABASE capabilities
TO capabilities_runtime;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO capabilities_migrator;

GRANT USAGE
ON SCHEMA public
TO capabilities_runtime;
