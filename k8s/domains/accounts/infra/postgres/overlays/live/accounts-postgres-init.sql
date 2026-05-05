-- Live placeholder bootstrap for the in-cluster Postgres unit. Managed
-- production should run an equivalent bootstrap with real passwords outside the
-- cluster, then remove this Postgres unit from the Flux graph.
-- Mirror role/grant changes in packages/database/bootstrap/managed-postgres.sql.

CREATE ROLE accounts_migrator;
CREATE ROLE accounts_runtime;
CREATE ROLE accounts_api;
CREATE ROLE accounts_worker;

ALTER ROLE accounts_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

ALTER ROLE accounts_runtime
WITH NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

ALTER ROLE accounts_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

ALTER ROLE accounts_worker
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD 'dev';

GRANT accounts_runtime TO accounts_api;
GRANT accounts_runtime TO accounts_worker;

REVOKE CONNECT, TEMPORARY ON DATABASE accounts FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE accounts
TO accounts_migrator;

GRANT CONNECT
ON DATABASE accounts
TO accounts_runtime;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO accounts_migrator;

GRANT USAGE
ON SCHEMA public
TO accounts_runtime;
