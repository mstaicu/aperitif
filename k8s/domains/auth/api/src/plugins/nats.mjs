import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import fp from "fastify-plugin";
import nconf from "nconf";

export const natsPlugin = fp(async (fastify) => {
  const nc = await connect({
    name: "auth-api",
    pass: nconf.get("NATS_PASSWORD"),
    servers: nconf.get("NATS_URL"),
    user: nconf.get("NATS_USER"),
  });

  const jsm = await jetstreamManager(nc);

  // max_bytes, retention, and discard
  // work together to define how
  // your stream behaves when it reaches capacity.
  try {
    await jsm.streams.add({
      discard: "old",
      max_bytes: Math.pow(1024, 3) * 1, // 1GiB
      name: "auth",
      num_replicas: 3,
      retention: "limits",
      storage: "file",
      subjects: ["auth.>"],
    });
  } catch (e) {
    fastify.log.error(e, "stream creation");
  }

  // fastify.decorate("nc", nc);
  fastify.decorate("js", jetstream(nc));
  // fastify.decorate("jsm", jsm);

  fastify.addHook("onClose", async () => {
    if (!nc.isClosed()) {
      await nc.drain();
    }
  });
});
