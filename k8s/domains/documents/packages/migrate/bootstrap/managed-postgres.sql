-- Managed Postgres bootstrap. Pass required password variables with psql.
-- Keep roles/grants aligned with the matching infra/postgres overlay.

\set ON_ERROR_STOP on

\if :{?documents_migrator_password}
\else
  \echo 'missing required psql variable: documents_migrator_password'
  \quit 1
\endif

\if :{?documents_api_password}
\else
  \echo 'missing required psql variable: documents_api_password'
  \quit 1
\endif

\if :{?documents_worker_password}
\else
  \echo 'missing required psql variable: documents_worker_password'
  \quit 1
\endif

SELECT CASE WHEN current_database() = 'documents' THEN 'true' ELSE 'false' END
  AS connected_to_documents
\gset

\if :connected_to_documents
\else
  \echo 'connect to the documents database before running this bootstrap script'
  \quit 1
\endif

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'documents_migrator') THEN
    CREATE ROLE documents_migrator LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'documents_api') THEN
    CREATE ROLE documents_api LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'documents_worker') THEN
    CREATE ROLE documents_worker LOGIN;
  END IF;
END
$$;

ALTER ROLE documents_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'documents_migrator_password';

ALTER ROLE documents_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'documents_api_password';

ALTER ROLE documents_worker
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'documents_worker_password';

REVOKE CONNECT, TEMPORARY ON DATABASE documents FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE documents
TO documents_migrator;

GRANT CONNECT
ON DATABASE documents
TO documents_api,
   documents_worker;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO documents_migrator;

GRANT USAGE
ON SCHEMA public
TO documents_api,
   documents_worker;
