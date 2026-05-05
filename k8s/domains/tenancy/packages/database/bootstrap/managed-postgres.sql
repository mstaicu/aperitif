-- Managed Postgres bootstrap for the tenancy domain.
--
-- Run this before Flux reconciles tenancy-migrate, using the managed DB
-- provider/admin user while connected to the tenancy database.
--
-- Example:
--   /opt/homebrew/opt/libpq/bin/psql "$TENANCY_ADMIN_DATABASE_URL" \
--     -v tenancy_migrator_password='replace-me' \
--     -v tenancy_api_password='replace-me' \
--     -v tenancy_worker_password='replace-me' \
--     -f domains/tenancy/packages/database/bootstrap/managed-postgres.sql
--
-- This script creates only roles and base grants. Flyway owns tables, indexes,
-- sequences, comments, triggers, and object-level runtime grants.
-- Mirror role/grant changes in infra/postgres/overlays/*/tenancy-postgres-init.sql.

\set ON_ERROR_STOP on

\if :{?tenancy_migrator_password}
\else
  \echo 'missing required psql variable: tenancy_migrator_password'
  \quit 1
\endif

\if :{?tenancy_api_password}
\else
  \echo 'missing required psql variable: tenancy_api_password'
  \quit 1
\endif

\if :{?tenancy_worker_password}
\else
  \echo 'missing required psql variable: tenancy_worker_password'
  \quit 1
\endif

SELECT CASE WHEN current_database() = 'tenancy' THEN 'true' ELSE 'false' END
  AS connected_to_tenancy
\gset

\if :connected_to_tenancy
\else
  \echo 'connect to the tenancy database before running this bootstrap script'
  \quit 1
\endif

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenancy_migrator') THEN
    CREATE ROLE tenancy_migrator LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenancy_runtime') THEN
    CREATE ROLE tenancy_runtime NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenancy_api') THEN
    CREATE ROLE tenancy_api LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenancy_worker') THEN
    CREATE ROLE tenancy_worker LOGIN;
  END IF;
END
$$;

ALTER ROLE tenancy_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'tenancy_migrator_password';

ALTER ROLE tenancy_runtime
WITH NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

ALTER ROLE tenancy_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'tenancy_api_password';

ALTER ROLE tenancy_worker
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'tenancy_worker_password';

GRANT tenancy_runtime TO tenancy_api;
GRANT tenancy_runtime TO tenancy_worker;

REVOKE CONNECT, TEMPORARY ON DATABASE tenancy FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE tenancy
TO tenancy_migrator;

GRANT CONNECT
ON DATABASE tenancy
TO tenancy_runtime;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO tenancy_migrator;

GRANT USAGE
ON SCHEMA public
TO tenancy_runtime;
