import nconf from "nconf";

import { sdk } from "./otel.mjs";

nconf
  .env()
  .required([
    "JWT_PRIVATE_KEY_PATH",
    "JWT_PUBLIC_KEY_PATH",
    "MONGO_DB_URI",
    "NATS_CREDS_KEY_PATH",
    "ORIGIN",
  ]);

const origin = nconf.get("ORIGIN");

try {
  new URL(origin);
} catch {
  throw new Error(`Invalid ORIGIN: ${origin}`);
}

sdk.start();

import("./server.mjs");
