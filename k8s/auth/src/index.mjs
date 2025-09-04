import nconf from "nconf";

nconf
  .env()
  .required([
    "JWT_PRIVATE_KEY_PATH",
    "JWT_PUBLIC_KEY_PATH",
    "MONGO_DB_URI",
    "WEBAUTHN_RP_URL",
  ]);

const rpUrl = nconf.get("WEBAUTHN_RP_URL");

try {
  new URL(rpUrl);
} catch {
  throw new Error(`Invalid WEBAUTHN_RP_URL: ${rpUrl}`);
}

import("./server.mjs");
