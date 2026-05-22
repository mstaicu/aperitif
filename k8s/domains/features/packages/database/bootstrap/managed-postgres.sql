-- Managed Postgres bootstrap. Pass required password variables with psql.
-- Keep roles/grants aligned with the matching infra/postgres overlay.

\set ON_ERROR_STOP on

\if :{?features_migrator_password}
\else
  \echo 'missing required psql variable: features_migrator_password'
  \quit 1
\endif

\if :{?features_api_password}
\else
  \echo 'missing required psql variable: features_api_password'
  \quit 1
\endif

\if :{?features_worker_password}
\else
  \echo 'missing required psql variable: features_worker_password'
  \quit 1
\endif

SELECT CASE WHEN current_database() = 'features' THEN 'true' ELSE 'false' END
  AS connected_to_features
\gset

\if :connected_to_features
\else
  \echo 'connect to the features database before running this bootstrap script'
  \quit 1
\endif

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'features_migrator') THEN
    CREATE ROLE features_migrator LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'features_runtime') THEN
    CREATE ROLE features_runtime NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'features_api') THEN
    CREATE ROLE features_api LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'features_worker') THEN
    CREATE ROLE features_worker LOGIN;
  END IF;
END
$$;

ALTER ROLE features_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'features_migrator_password';

ALTER ROLE features_runtime
WITH NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

ALTER ROLE features_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'features_api_password';

ALTER ROLE features_worker
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'features_worker_password';

GRANT features_runtime TO features_api;
GRANT features_runtime TO features_worker;

REVOKE CONNECT, TEMPORARY ON DATABASE features FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE features
TO features_migrator;

GRANT CONNECT
ON DATABASE features
TO features_runtime;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO features_migrator;

GRANT USAGE
ON SCHEMA public
TO features_runtime;
