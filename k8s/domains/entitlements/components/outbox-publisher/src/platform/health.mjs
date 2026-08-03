import http from "node:http";

/**
 * @param {{
 *   pool: import("pg").Pool,
 *   nc: import("@nats-io/transport-node").NatsConnection,
 * }} args
 */
export function createHealthServer({ nc, pool }) {
  return http.createServer(async (req, res) => {
    if (req.url === "/livez") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }

    if (req.url === "/readyz") {
      try {
        await pool.query("SELECT 1");
        await nc.flush();

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
