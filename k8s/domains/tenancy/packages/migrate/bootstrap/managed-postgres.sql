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

CREATE ROLE tenancy_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'tenancy_migrator_password';

CREATE ROLE tenancy_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'tenancy_api_password';

CREATE ROLE tenancy_worker
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'tenancy_worker_password';

REVOKE CONNECT, TEMPORARY ON DATABASE tenancy FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE tenancy
TO tenancy_migrator;

GRANT CONNECT
ON DATABASE tenancy
TO tenancy_api,
   tenancy_worker;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO tenancy_migrator;

GRANT USAGE
ON SCHEMA public
TO tenancy_api,
   tenancy_worker;
