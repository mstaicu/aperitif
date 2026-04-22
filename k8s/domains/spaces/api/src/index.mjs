import nconf from "nconf";

nconf.env().required(["DATABASE_URL", "IDENTITIES_JWKS_URL"]);

await import("./server.mjs");
