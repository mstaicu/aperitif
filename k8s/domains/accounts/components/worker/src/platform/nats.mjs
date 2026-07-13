import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";

export async function createNats() {
  if (!process.env.NATS_URL) {
    throw new Error("NATS_URL is required");
  }

  const nc = await connect({
    name: "accounts-worker",
    servers: [process.env.NATS_URL],
  });

  const close = async () => {
    if (!nc.isClosed()) {
      await nc.drain();
      await nc.closed();
    }
  };

  return {
    close,
    js: jetstream(nc),
    jsm: await jetstreamManager(nc),
    nc,
    [Symbol.asyncDispose]: close,
  };
}

/**
 * @typedef {Awaited<ReturnType<typeof createNats>>} NatsClient
 */
