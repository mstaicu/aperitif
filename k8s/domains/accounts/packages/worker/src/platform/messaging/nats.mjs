import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";

export async function createNatsContext() {
  const nc = await connect({
    name: "accounts-worker",
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
