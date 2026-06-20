import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { GenericContainer, Wait } from "testcontainers";

/**
 * @param {import("node:test").TestContext} t
 */
export const startNats = async (t) => {
  const container = await new GenericContainer("nats:2.14.2-alpine")
    .withCommand(["-js"])
    .withExposedPorts(4222)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const nc = await connect({
    name: "capabilities-worker-test",
    servers: [`nats://localhost:${container.getMappedPort(4222)}`],
  });

  const nats = {
    close: async () => {
      if (!nc.isClosed()) {
        await nc.drain();
        await nc.closed();
      }
    },
    js: jetstream(nc),
    jsm: await jetstreamManager(nc),
    nc,
  };

  t.after(async () => {
    await nats.close();
    await container.stop();
  });

  return nats;
};
