import { once } from "node:events";
import http from "node:http";
import process from "node:process";

import { ensureAccountsConsumer } from "./platform/messaging/accounts-consumer.mjs";
import { ensureCapabilitiesStream } from "./platform/messaging/capabilities-stream.mjs";
import { createNats } from "./platform/nats.mjs";
import { createPostgres } from "./platform/postgres.mjs";
import { runProjectAccounts } from "./tasks/project-accounts.mjs";
import { runPublishOutbox } from "./tasks/publish-outbox.mjs";

const streamReplicas = getStreamReplicas();
const postgres = createPostgres();
const nats = await createNats();
const controller = new AbortController();

await ensureCapabilitiesStream({ nats, streamReplicas });
await ensureAccountsConsumer({ nats });

const health = http.createServer(async (req, res) => {
  if (req.url === "/livez") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.url === "/readyz") {
    try {
      await postgres.db.query("SELECT 1");
      await nats.nc.flush();

      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    } catch {
      res.writeHead(503, { "content-type": "text/plain" });
      res.end("not ready");
      return;
    }
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end();
});

health.listen(3000, "0.0.0.0");

const tasks = [
  runProjectAccounts({ db: postgres.db, nats }, controller.signal),
  runPublishOutbox({ db: postgres.db, nats }, controller.signal),
];
const shutdown = Promise.race(
  ["SIGINT", "SIGTERM", "SIGUSR2"].map((name) => once(process, name)),
);

console.log(
  JSON.stringify({
    event: "worker_started",
    level: "info",
    service: "capabilities-worker",
  }),
);

try {
  await Promise.race([...tasks, shutdown]);
} finally {
  console.log(
    JSON.stringify({
      event: "worker_closing",
      level: "info",
      service: "capabilities-worker",
    }),
  );

  controller.abort();

  await Promise.allSettled(tasks);

  await health[Symbol.asyncDispose]();

  console.log(
    JSON.stringify({
      event: "resources_closing",
      level: "info",
      service: "capabilities-worker",
    }),
  );
  try {
    await nats.close();
  } finally {
    await postgres.close();
  }
  console.log(
    JSON.stringify({
      event: "worker_stopped",
      level: "info",
      service: "capabilities-worker",
    }),
  );
}

function getStreamReplicas() {
  if (!process.env.NATS_STREAM_REPLICAS) {
    throw new Error("NATS_STREAM_REPLICAS is required");
  }

  const replicas = Number(process.env.NATS_STREAM_REPLICAS);

  if (!Number.isInteger(replicas) || replicas < 1) {
    throw new Error("NATS_STREAM_REPLICAS must be a positive integer");
  }

  return replicas;
}
