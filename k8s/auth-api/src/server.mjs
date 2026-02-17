// @ts-check
import swagger from "@fastify/swagger";
// import { connect } from "@nats-io/transport-node";
import swaggerUI from "@fastify/swagger-ui";
import Fastify from "fastify";
import nconf from "nconf";
import { Pool } from "pg";

import { routes as auth } from "./routes/auth.mjs";
import { routes as jwks } from "./routes/jwks.mjs";

var fastify = Fastify({
  bodyLimit: 20 * 1024, // 20kb
  logger: true,
  trustProxy: true,
});

await fastify.register(swagger, {
  openapi: {
    info: {
      description: "Passkey-only authentication service",
      title: "TODO",
      version: "1.0.0",
    },
    openapi: "3.1.0",
  },
});
await fastify.register(swaggerUI, {
  routePrefix: "/docs",
});

var pool = new Pool({
  connectionString: nconf.get("DATABASE_URL"),
});

// var servers = Array.from(Array(3)).map(
//   (_, index) =>
//     `nats://nats-depl-${index}.nats-headless.nats.svc.cluster.local:4222`,
// );

// var nc = await connect({
//   name: "auth-api",
//   servers,
// });

// app.use((_, res, next) =>
//   connection.readyState !== 1 || nc.isClosed() ? res.sendStatus(503) : next(),
// );

fastify.get("/healthz", async () => ({ ok: true }));
fastify.get("/readyz", async (_req, reply) => {
  try {
    await pool.query("SELECT 1");
    return reply.code(200).send({ ok: true });
  } catch {
    return reply.code(503).send({ ok: false });
  }
});

await fastify.register(jwks);
await fastify.register(auth, { pool });

fastify.addHook("onClose", async function onClose() {
  // if (nc && !nc.isClosed()) {
  //   console.log("draining NATS...");
  //   try {
  //     await nc.drain();
  //   } catch {
  //     await nc.close();
  //   }
  // }

  await pool.end();
});

await fastify.ready();

await fastify.listen({
  host: "0.0.0.0",
  port: 3000,
});
