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
-- Mirror role/grant changes in infra/postgres/overlays/*/accounts-postgres-init.sql.

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

SELECT CASE WHEN current_database() = 'accounts' THEN 'true' ELSE 'false' END
  AS connected_to_accounts
\gset

\if :connected_to_accounts
\else
  \echo 'connect to the accounts database before running this bootstrap script'
  \quit 1
\endif

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
