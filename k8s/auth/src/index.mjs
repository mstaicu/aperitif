import nconf from "nconf";

nconf.env().required([
  "JWT_PRIVATE_KEY_PATH",
  "JWT_PUBLIC_KEY_PATH",
  "MONGO_DB_URI",
  // "ORIGIN",
]);

// const origin = nconf.get("ORIGIN");

// try {
//   new URL(origin);
// } catch {
//   throw new Error(`Invalid ORIGIN: ${origin}`);
// }

import("./server.mjs");
