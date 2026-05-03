import nconf from "nconf";

import { createNatsContext } from "./messaging/nats.mjs";
import { createPgContext } from "./persistence/pg.mjs";

export async function createContext() {
  const pg = createPgContext();
  const streamReplicas = getStreamReplicas();

  try {
    const nats = await createNatsContext();

    return {
      app: {
        streamReplicas,
      },
      lifecycle: {
        close: async () => {
          try {
            await nats.close();
          } finally {
            await pg.close();
          }
        },
      },
      messaging: {
        js: nats.js,
        jsm: nats.jsm,
      },
      persistence: {
        db: pg.db,
      },
    };
  } catch (err) {
    await pg.close().catch(() => {});
    throw err;
  }
}

function getStreamReplicas() {
  const replicas = Number(nconf.get("NATS_STREAM_REPLICAS"));

  if (!Number.isInteger(replicas) || replicas < 1) {
    throw new Error("NATS_STREAM_REPLICAS must be a positive integer");
  }

  return replicas;
}

/**
 * @typedef {Awaited<ReturnType<typeof createContext>>} WorkerContext
 */
