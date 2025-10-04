import nconf from "nconf";

nconf.env().required(["MONGO_DB_URI"]);

import("./worker.mjs");
