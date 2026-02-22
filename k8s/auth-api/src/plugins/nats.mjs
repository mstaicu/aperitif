import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import fp from "fastify-plugin";

export const natsPlugin = fp(async function (fastify) {
  const servers = Array.from(Array(3)).map(
    (_, index) =>
      `nats://nats-depl-${index}.nats-headless.nats.svc.cluster.local:4222`,
  );

  const nc = await connect({
    name: "auth-api",
    servers,
  });

  const js = jetstream(nc);
  const jsm = jetstreamManager(nc);

  fastify.decorate("nc", nc);
  fastify.decorate("js", js);
  fastify.decorate("jsm", jsm);

  fastify.addHook("onClose", async () => {
    if (!nc.isClosed()) {
      await nc.drain();
    }
  });
});
