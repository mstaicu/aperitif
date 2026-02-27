import nconf from "nconf";

nconf
  .env()
  .required(["DATABASE_URL", "NATS_URL", "NATS_USER", "NATS_PASSWORD"]);

import("./worker.mjs");
