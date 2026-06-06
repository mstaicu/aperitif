-- Managed Postgres bootstrap. Pass required password variables with psql.
-- Keep roles/grants aligned with the matching infra/postgres overlay.

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

SELECT CASE WHEN current_database() = 'identity' THEN 'true' ELSE 'false' END
  AS connected_to_identity
\gset

\if :connected_to_identity
\else
  \echo 'connect to the identity database before running this bootstrap script'
  \quit 1
\endif

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'identity_migrator') THEN
    CREATE ROLE identity_migrator LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'identity_api') THEN
    CREATE ROLE identity_api LOGIN;
  END IF;
END
$$;

ALTER ROLE identity_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'identity_migrator_password';

ALTER ROLE identity_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'identity_api_password';

REVOKE CONNECT, TEMPORARY ON DATABASE identity FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE identity
TO identity_migrator;

GRANT CONNECT
ON DATABASE identity
TO identity_api;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO identity_migrator;

GRANT USAGE
ON SCHEMA public
TO identity_api;
