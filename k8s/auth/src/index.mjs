import nconf from "nconf";

nconf.env();

nconf.required([
  "MONGO_DB_URI",
  "DOMAIN",
  "JWT_PRIVATE_KEY_PATH",
  "JWT_PUBLIC_KEY_PATH",
]);

import("./server.mjs");
