-- Managed Postgres bootstrap for the accounts domain.
--
-- Run this before Flux reconciles accounts-migrate, using the managed DB
-- provider/admin user while connected to the accounts database.
--
-- Example:
--   /opt/homebrew/opt/libpq/bin/psql "$ACCOUNTS_ADMIN_DATABASE_URL" \
--     -v accounts_migrator_password='replace-me' \
--     -v accounts_api_password='replace-me' \
--     -v accounts_worker_password='replace-me' \
--     -f domains/accounts/packages/database/bootstrap/managed-postgres.sql
--
-- This script creates only roles and base grants. Flyway owns tables, indexes,
-- sequences, comments, triggers, and object-level runtime grants.
--
-- Sections marked MANAGED ONLY are intentionally absent from overlay init SQL.
-- Sections marked LOCKSTEP WITH OVERLAY INIT must be mirrored in:
--   domains/accounts/infra/postgres/overlays/dev/accounts-postgres-init.sql
--   domains/accounts/infra/postgres/overlays/live/accounts-postgres-init.sql
-- Overlay init files use placeholder dev passwords and one-time CREATE ROLE
-- statements because the official Postgres image runs them only for an empty
-- data directory.

-- MANAGED ONLY: psql safety and required password inputs.
-- Overlay init SQL cannot depend on caller-provided psql variables.
\set ON_ERROR_STOP on

\if :{?accounts_migrator_password}
\else
  \echo 'missing required psql variable: accounts_migrator_password'
  \quit 1
\endif

\if :{?accounts_api_password}
\else
  \echo 'missing required psql variable: accounts_api_password'
  \quit 1
\endif

\if :{?accounts_worker_password}
\else
  \echo 'missing required psql variable: accounts_worker_password'
  \quit 1
\endif

-- MANAGED ONLY: target database guard.
-- Overlay init SQL runs after POSTGRES_DB has created the target database.
SELECT CASE WHEN current_database() = 'accounts' THEN 'true' ELSE 'false' END
  AS connected_to_accounts
\gset

\if :connected_to_accounts
\else
  \echo 'connect to the accounts database before running this bootstrap script'
  \quit 1
\endif

-- LOCKSTEP WITH OVERLAY INIT: role declarations.
-- Overlay init mirrors these roles with plain CREATE ROLE statements.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'accounts_migrator') THEN
    CREATE ROLE accounts_migrator LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'accounts_runtime') THEN
    CREATE ROLE accounts_runtime NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'accounts_api') THEN
    CREATE ROLE accounts_api LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'accounts_worker') THEN
    CREATE ROLE accounts_worker LOGIN;
  END IF;
END
$$;

-- LOCKSTEP WITH OVERLAY INIT: role attributes and passwords.
-- Managed bootstrap uses real psql variables; overlay init uses 'dev'.
ALTER ROLE accounts_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'accounts_migrator_password';

ALTER ROLE accounts_runtime
WITH NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

ALTER ROLE accounts_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'accounts_api_password';

ALTER ROLE accounts_worker
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'accounts_worker_password';

-- LOCKSTEP WITH OVERLAY INIT: runtime role membership.
GRANT accounts_runtime TO accounts_api;
GRANT accounts_runtime TO accounts_worker;

-- LOCKSTEP WITH OVERLAY INIT: database access.
REVOKE CONNECT, TEMPORARY ON DATABASE accounts FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE accounts
TO accounts_migrator;

GRANT CONNECT
ON DATABASE accounts
TO accounts_runtime;

-- LOCKSTEP WITH OVERLAY INIT: schema access.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO accounts_migrator;

GRANT USAGE
ON SCHEMA public
TO accounts_runtime;
