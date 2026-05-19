import nconf from "nconf";

nconf
  .env()
  .required(["DATABASE_URL", "IDENTITY_JWKS_URL", "ACCESS_TOKEN_AUDIENCE"]);

await import("./server.mjs");
