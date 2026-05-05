-- Managed Postgres bootstrap for the identity domain.
--
-- Run this before Flux reconciles identity-migrate, using the managed DB
-- provider/admin user while connected to the identity database.
--
-- Example:
--   /opt/homebrew/opt/libpq/bin/psql "$IDENTITY_ADMIN_DATABASE_URL" \
--     -v identity_migrator_password='replace-me' \
--     -v identity_api_password='replace-me' \
--     -f domains/identity/packages/database/bootstrap/managed-postgres.sql
--
-- This script creates only roles and base grants. Flyway owns tables, indexes,
-- sequences, comments, triggers, and object-level runtime grants.
--
-- Sections marked MANAGED ONLY are intentionally absent from overlay init SQL.
-- Sections marked LOCKSTEP WITH OVERLAY INIT must be mirrored in:
--   domains/identity/infra/postgres/overlays/dev/identity-postgres-init.sql
--   domains/identity/infra/postgres/overlays/live/identity-postgres-init.sql
-- Overlay init files use placeholder dev passwords and one-time CREATE ROLE
-- statements because the official Postgres image runs them only for an empty
-- data directory.

-- MANAGED ONLY: psql safety and required password inputs.
-- Overlay init SQL cannot depend on caller-provided psql variables.
\set ON_ERROR_STOP on

\if :{?identity_migrator_password}
\else
  \echo 'missing required psql variable: identity_migrator_password'
  \quit 1
\endif

\if :{?identity_api_password}
\else
  \echo 'missing required psql variable: identity_api_password'
  \quit 1
\endif

-- MANAGED ONLY: target database guard.
-- Overlay init SQL runs after POSTGRES_DB has created the target database.
SELECT CASE WHEN current_database() = 'identity' THEN 'true' ELSE 'false' END
  AS connected_to_identity
\gset

\if :connected_to_identity
\else
  \echo 'connect to the identity database before running this bootstrap script'
  \quit 1
\endif

-- LOCKSTEP WITH OVERLAY INIT: role declarations.
-- Overlay init mirrors these roles with plain CREATE ROLE statements.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'identity_migrator') THEN
    CREATE ROLE identity_migrator LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'identity_runtime') THEN
    CREATE ROLE identity_runtime NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'identity_api') THEN
    CREATE ROLE identity_api LOGIN;
  END IF;
END
$$;

-- LOCKSTEP WITH OVERLAY INIT: role attributes and passwords.
-- Managed bootstrap uses real psql variables; overlay init uses 'dev'.
ALTER ROLE identity_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'identity_migrator_password';

ALTER ROLE identity_runtime
WITH NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

ALTER ROLE identity_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'identity_api_password';

-- LOCKSTEP WITH OVERLAY INIT: runtime role membership.
GRANT identity_runtime TO identity_api;

-- LOCKSTEP WITH OVERLAY INIT: database access.
REVOKE CONNECT, TEMPORARY ON DATABASE identity FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE identity
TO identity_migrator;

GRANT CONNECT
ON DATABASE identity
TO identity_runtime;

-- LOCKSTEP WITH OVERLAY INIT: schema access.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO identity_migrator;

GRANT USAGE
ON SCHEMA public
TO identity_runtime;
