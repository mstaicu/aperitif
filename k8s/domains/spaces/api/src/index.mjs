import nconf from "nconf";

nconf.env().required(["DATABASE_URL", "AUTH_JWKS_URL"]);

import("./server.mjs");
