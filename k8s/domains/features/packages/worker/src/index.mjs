import nconf from "nconf";

nconf.env().required(["DATABASE_URL", "NATS_STREAM_REPLICAS", "NATS_URL"]);

await import("./worker.mjs");
