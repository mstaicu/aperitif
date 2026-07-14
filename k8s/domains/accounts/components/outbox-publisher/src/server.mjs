import {
  DiscardPolicy,
  jetstreamManager,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import process from "node:process";
import { Pool } from "pg";

import { createHealthServer } from "./platform/health.mjs";
import { publishEvents } from "./publish.mjs";

const controller = new AbortController();

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.once(signal, () => controller.abort());
}

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

db.on("error", (err) => console.error(err));

await using nc = await connect({
  name: "accounts-outbox-publisher",
  servers: [/** @type {string} */ (process.env.NATS_URL)],
  timeout: 2_000,
});

const streamName = "ACCOUNTS";
const jsm = await jetstreamManager(nc);

await jsm.streams.add({
  discard: DiscardPolicy.New,
  max_bytes: Number(process.env.NATS_STREAM_MAX_BYTES),
  name: streamName,
  num_replicas: Number(process.env.NATS_STREAM_REPLICAS),
  retention: RetentionPolicy.Limits,
  storage: StorageType.File,
  subjects: ["accounts.>"],
});

await using health = createHealthServer({ db, nc });

health.listen(3000, "0.0.0.0");

await publishEvents({
  db,
  nc,
  signal: controller.signal,
});

await db.end();
