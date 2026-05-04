import * as http from "node:http";
import { createRequestListener } from "remix/node-fetch-server";

import { router } from "./app/router.ts";

const server = http.createServer(
  createRequestListener((request) => router.fetch(request)),
);
const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 44100;
let shuttingDown = false;

server.listen(port, () => console.log(`listening on http://localhost:${port}`));

async function shutdown() {
  if (shuttingDown) return;

  shuttingDown = true;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
}

["SIGINT", "SIGTERM"].forEach((signal) =>
  process.once(signal, () => {
    void shutdown().catch(() => {
      process.exitCode = 1;
    });
  }),
);
