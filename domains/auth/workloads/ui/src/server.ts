import { once } from "node:events";
import * as http from "node:http";

import { createRequestListener } from "remix/node-fetch-server";

import { assets, router } from "./app.ts";

try {
  await using server = http.createServer(
    createRequestListener((request) => router.fetch(request)),
  );
  const port = Number(process.env.PORT ?? 3000);

  server.listen(port);
  await once(server, "listening");

  console.log(
    JSON.stringify({
      event: "server_started",
      level: "info",
      port,
      service: "auth-ui",
    }),
  );

  await Promise.race([
    once(server, "close"),
    ...["SIGINT", "SIGTERM"].map((signal) => once(process, signal)),
  ]);
} finally {
  await assets.close();
}
