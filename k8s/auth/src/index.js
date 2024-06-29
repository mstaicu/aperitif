import nconf from "nconf";

nconf.env({ lowerCase: true, parseValues: true, separator: "_" });

import("./server.js");
