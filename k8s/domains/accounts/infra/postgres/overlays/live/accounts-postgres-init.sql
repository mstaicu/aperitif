-- Live placeholder bootstrap for the in-cluster Postgres unit. Managed
-- production should run an equivalent bootstrap with real passwords outside the
-- cluster, then remove this Postgres unit from the Flux graph.
--
-- This file has no MANAGED ONLY sections. It mirrors only the sections marked
-- LOCKSTEP WITH OVERLAY INIT in packages/database/bootstrap/managed-postgres.sql.
-- Managed bootstrap uses real psql password variables; this placeholder-live
-- init uses placeholder 'dev' passwords.

-- LOCKSTEP WITH MANAGED BOOTSTRAP: role declarations and capabilities.
-- Managed bootstrap expresses these capabilities with ALTER ROLE and real
-- passwords. Placeholder-live init uses one-time CREATE ROLE statements with
-- 'dev'.
CREATE ROLE accounts_migrator LOGIN PASSWORD 'dev';
CREATE ROLE accounts_runtime NOLOGIN;
CREATE ROLE accounts_api LOGIN PASSWORD 'dev';
CREATE ROLE accounts_worker LOGIN PASSWORD 'dev';

-- LOCKSTEP WITH MANAGED BOOTSTRAP: runtime role membership.
-- Login roles inherit a shared runtime role so object grants stay in migrations.
GRANT accounts_runtime TO accounts_api;
GRANT accounts_runtime TO accounts_worker;

-- LOCKSTEP WITH MANAGED BOOTSTRAP: database access.
REVOKE CONNECT, TEMPORARY ON DATABASE accounts FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE accounts
TO accounts_migrator;

GRANT CONNECT
ON DATABASE accounts
TO accounts_runtime;

-- LOCKSTEP WITH MANAGED BOOTSTRAP: schema access.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO accounts_migrator;

GRANT USAGE
ON SCHEMA public
TO accounts_runtime;
