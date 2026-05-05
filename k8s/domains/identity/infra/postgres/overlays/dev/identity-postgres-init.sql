-- Local/CI placeholder bootstrap. The official Postgres image runs this once
-- when the data directory is empty. Managed production should run an equivalent
-- bootstrap with real passwords outside the in-cluster Postgres unit.
--
-- This file has no MANAGED ONLY sections. It mirrors only the sections marked
-- LOCKSTEP WITH OVERLAY INIT in packages/database/bootstrap/managed-postgres.sql.
-- Managed bootstrap uses real psql password variables; this local/CI init uses
-- placeholder 'dev' passwords.

-- LOCKSTEP WITH MANAGED BOOTSTRAP: role declarations and capabilities.
-- Managed bootstrap expresses these capabilities with ALTER ROLE and real
-- passwords. Local/CI init uses one-time CREATE ROLE statements with 'dev'.
CREATE ROLE identity_migrator LOGIN PASSWORD 'dev';
CREATE ROLE identity_runtime NOLOGIN;
CREATE ROLE identity_api LOGIN PASSWORD 'dev';

-- LOCKSTEP WITH MANAGED BOOTSTRAP: runtime role membership.
-- Login roles inherit a shared runtime role so object grants stay in migrations.
GRANT identity_runtime TO identity_api;

-- LOCKSTEP WITH MANAGED BOOTSTRAP: database access.
REVOKE CONNECT, TEMPORARY ON DATABASE identity FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE identity
TO identity_migrator;

GRANT CONNECT
ON DATABASE identity
TO identity_runtime;

-- LOCKSTEP WITH MANAGED BOOTSTRAP: schema access.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO identity_migrator;

GRANT USAGE
ON SCHEMA public
TO identity_runtime;
