import http from "node:http";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   nats: import("./nats.mjs").NatsClient,
 * }} args
 */
export function createHealthServer({ db, nats }) {
  return http.createServer(async (req, res) => {
    if (req.url === "/livez") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }

    if (req.url === "/readyz") {
      try {
        await db.query("SELECT 1");
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
}
