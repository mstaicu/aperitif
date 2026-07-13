import * as http from "node:http";
import { createRequestListener } from "remix/node-fetch-server";

import { router } from "./app/router.ts";

const server = http.createServer(
  createRequestListener((request) => router.fetch(request)),
);
const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
let shuttingDown = false;

server.listen(port, () =>
  console.log(
    JSON.stringify({
      event: "server_started",
      level: "info",
      port,
      service: "documents-ui",
    }),
  ),
);

async function shutdown() {
  if (shuttingDown) return;

  shuttingDown = true;

  server.closeAllConnections();
  await server[Symbol.asyncDispose]();
}

["SIGINT", "SIGTERM"].forEach((signal) =>
  process.once(signal, () => {
    void shutdown().catch(() => {
      process.exitCode = 1;
    });
  }),
);
