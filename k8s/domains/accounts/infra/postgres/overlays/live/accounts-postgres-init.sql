-- Live placeholder bootstrap for the in-cluster Postgres unit. Managed
-- production should run an equivalent bootstrap with real passwords outside the
-- cluster, then remove this Postgres unit from the Flux graph.

CREATE ROLE accounts_migrator LOGIN PASSWORD 'dev';
CREATE ROLE accounts_runtime NOLOGIN;
CREATE ROLE accounts_api LOGIN PASSWORD 'dev';
CREATE ROLE accounts_worker LOGIN PASSWORD 'dev';

-- Login roles inherit a shared runtime role so object grants stay in migrations.
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
