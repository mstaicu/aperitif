import nconf from "nconf";

nconf
  .env()
  .required([
    "JWT_PRIVATE_KEY_PATH",
    "JWT_PUBLIC_KEY_PATH",
    "DATABASE_URL",
    "ORIGIN",
  ]);

var origin = nconf.get("ORIGIN");

try {
  new URL(origin);
} catch {
  throw new Error(`Invalid ORIGIN: ${origin}`);
}

import("./server.mjs");
