import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import fp from "fastify-plugin";
import nconf from "nconf";

export const natsPlugin = fp(async (fastify) => {
  const nc = await connect({
    name: "auth-api",
    servers: [nconf.get("NATS_URL")],
    user: nconf.get("NATS_USER"),
    pass: nconf.get("NATS_PASSWORD"),
  });

  const js = jetstream(nc);
  const jsm = await jetstreamManager(nc);

  try {
    await jsm.streams.add({
      name: "auth",
      subjects: ["auth.>"],
      storage: "file",
      num_replicas: 3,
    });
  } catch {}

  fastify.decorate("nc", nc);
  fastify.decorate("js", js);
  fastify.decorate("jsm", jsm);

  fastify.addHook("onClose", async () => {
    if (!nc.isClosed()) {
      await nc.drain();
    }
  });
});
