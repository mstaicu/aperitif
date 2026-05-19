import nconf from "nconf";

nconf.env().required(["DATABASE_URL", "NATS_URL"]);

await import("./worker.mjs");
