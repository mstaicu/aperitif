import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";

export async function createNats() {
  if (!process.env.NATS_URL) {
    throw new Error("NATS_URL is required");
  }

  const nc = await connect({
    name: "documents-worker",
    servers: [process.env.NATS_URL],
  });

  return {
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
}
