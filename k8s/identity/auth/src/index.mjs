import nconf from "nconf";

nconf.env();

nconf.required(["MONGO_DB_URI", "DOMAIN", "ORIGIN"]);

import("./server.mjs");
