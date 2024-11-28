// @ts-check
import nconf from "nconf";

nconf.env();

nconf.required([
  "MONGO_DB_URI",
  "DOMAIN",
  "ORIGIN",
  "ACCESS_TOKEN_PRIVATE_KEY",
  "ACCESS_TOKEN_PUBLIC_KEY",
  "REFRESH_TOKEN_SECRET",
]);

import("./server.mjs");
