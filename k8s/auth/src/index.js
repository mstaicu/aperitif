import nconf from "nconf";

nconf
  .env({ parseValues: true })
  .argv()
  .file("defaults", { dir: __dirname, file: "config.json" });

import "./server";
