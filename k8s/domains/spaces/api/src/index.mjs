import nconf from "nconf";

nconf.env().required(["DATABASE_URL"]);

import("./server.mjs");
