-- Live placeholder bootstrap for the in-cluster Postgres unit. Managed
-- production should run an equivalent bootstrap with real passwords outside the
-- cluster, then remove this Postgres unit from the Flux graph.

CREATE ROLE identity_migrator LOGIN PASSWORD 'dev';
CREATE ROLE identity_runtime NOLOGIN;
CREATE ROLE identity_api LOGIN PASSWORD 'dev';

-- Login roles inherit a shared runtime role so object grants stay in migrations.
GRANT identity_runtime TO identity_api;

REVOKE CONNECT, TEMPORARY ON DATABASE identity FROM PUBLIC;

GRANT CONNECT, CREATE, TEMPORARY
ON DATABASE identity
TO identity_migrator;

GRANT CONNECT
ON DATABASE identity
TO identity_runtime;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE
ON SCHEMA public
TO identity_migrator;

GRANT USAGE
ON SCHEMA public
TO identity_runtime;
