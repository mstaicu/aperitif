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

CREATE ROLE capabilities_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'capabilities_migrator_password';

CREATE ROLE capabilities_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'capabilities_api_password';

CREATE ROLE capabilities_worker
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
