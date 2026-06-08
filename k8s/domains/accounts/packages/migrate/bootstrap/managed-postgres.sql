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

CREATE ROLE accounts_migrator
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'accounts_migrator_password';

CREATE ROLE accounts_api
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'accounts_api_password';

CREATE ROLE accounts_worker
WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
PASSWORD :'accounts_worker_password';

REVOKE CONNECT, TEMPORARY ON DATABASE accounts FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE accounts
TO accounts_migrator;

GRANT CONNECT
ON DATABASE accounts
TO accounts_api,
   accounts_worker;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO accounts_migrator;

GRANT USAGE
ON SCHEMA public
TO accounts_api,
   accounts_worker;
