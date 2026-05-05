-- Live placeholder bootstrap for the in-cluster Postgres unit. Managed
-- production should run an equivalent bootstrap with real passwords outside the
-- cluster, then remove this Postgres unit from the Flux graph.
--
-- Keep role names, memberships, and database/schema grants in lockstep with
-- packages/database/bootstrap/managed-postgres.sql. This file differs only by
-- using placeholder dev passwords.

-- Section: local role declarations and placeholder passwords.
CREATE ROLE accounts_migrator LOGIN PASSWORD 'dev';
CREATE ROLE accounts_runtime NOLOGIN;
CREATE ROLE accounts_api LOGIN PASSWORD 'dev';
CREATE ROLE accounts_worker LOGIN PASSWORD 'dev';

-- Section: runtime role membership.
-- Login roles inherit a shared runtime role so object grants stay in migrations.
GRANT accounts_runtime TO accounts_api;
GRANT accounts_runtime TO accounts_worker;

-- Section: database access.
REVOKE CONNECT, TEMPORARY ON DATABASE accounts FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE accounts
TO accounts_migrator;

GRANT CONNECT
ON DATABASE accounts
TO accounts_runtime;

-- Section: schema access.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO accounts_migrator;

GRANT USAGE
ON SCHEMA public
TO accounts_runtime;
