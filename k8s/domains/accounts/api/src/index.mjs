import nconf from "nconf";

nconf.env().required(["DATABASE_URL", "IDENTITIES_JWKS_URL", "JWT_AUDIENCE"]);

await import("./server.mjs");
