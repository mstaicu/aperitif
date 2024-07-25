import nconf from "nconf";

nconf.env();

nconf.required([
  "AUTH_EXPRESS_PORT",
  "AUTH_MONGODB_URI",
  "DOMAIN",
  "ORIGIN",
  "REGISTRATION_ACCESS_TOKEN",
  "REDIS_PORT",
  "REDIS_HOST",
]);

import("./server.mjs");
