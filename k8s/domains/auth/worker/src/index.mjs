import nconf from "nconf";

nconf
  .env()
  .required(["DATABASE_URL", "NATS_URL"]);

import("./worker.mjs");
