-- Managed Postgres bootstrap. Pass required password variables with psql.
-- Keep roles/grants aligned with the matching infra/postgres overlay.

\set ON_ERROR_STOP on

\if :{?capabilities_migrator_password}
\else
  \echo 'missing required psql variable: capabilities_migrator_password'
  \quit 1
\endif

\if :{?capabilities_api_password}
\else
  \echo 'missing required psql variable: capabilities_api_password'
  \quit 1
\endif

\if :{?capabilities_worker_password}
\else
  \echo 'missing required psql variable: capabilities_worker_password'
  \quit 1
\endif

SELECT CASE WHEN current_database() = 'capabilities' THEN 'true' ELSE 'false' END
  AS connected_to_capabilities
\gset

\if :connected_to_capabilities
\else
  \echo 'connect to the capabilities database before running this bootstrap script'
  \quit 1
\endif

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'capabilities_migrator') THEN
    CREATE ROLE capabilities_migrator LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'capabilities_api') THEN
    CREATE ROLE capabilities_api LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'capabilities_worker') THEN
    CREATE ROLE capabilities_worker LOGIN;
  END IF;
END
$$;

ALTER ROLE capabilities_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'capabilities_migrator_password';

ALTER ROLE capabilities_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'capabilities_api_password';

ALTER ROLE capabilities_worker
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'capabilities_worker_password';

REVOKE CONNECT, TEMPORARY ON DATABASE capabilities FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE capabilities
TO capabilities_migrator;

GRANT CONNECT
ON DATABASE capabilities
TO capabilities_api,
   capabilities_worker;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO capabilities_migrator;

GRANT USAGE
ON SCHEMA public
TO capabilities_api,
   capabilities_worker;
