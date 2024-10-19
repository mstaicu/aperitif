import nconf from "nconf";

nconf.env();

nconf.required(["PORT", "MONGO_DB_URI", "DOMAIN", "ORIGIN"]);

import("./server.mjs");
