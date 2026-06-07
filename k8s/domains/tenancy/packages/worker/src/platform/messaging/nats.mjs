import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import nconf from "nconf";

export async function createNatsContext() {
  const nc = await connect({
    name: "tenancy-worker",
    servers: [nconf.get("NATS_URL")],
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
