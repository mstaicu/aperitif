import { createNats } from "./nats.mjs";
import { createPostgres } from "./postgres.mjs";

export const createRuntime = async () => {
  const postgres = createPostgres();

  try {
    const streamReplicas = getStreamReplicas();
    const nats = await createNats();

    return {
      app: {
        streamReplicas,
      },
      db: postgres.db,
      lifecycle: {
        close: async () => {
          try {
            await nats.close();
          } finally {
            await postgres.close();
          }
        },
      },
      messaging: {
        js: nats.js,
        jsm: nats.jsm,
        nc: nats.nc,
      },
    };
  } catch (err) {
    await postgres.close().catch(() => {});
    throw err;
  }
};

function getStreamReplicas() {
  if (!process.env.NATS_STREAM_REPLICAS) {
    throw new Error("NATS_STREAM_REPLICAS is required");
  }

  const replicas = Number(process.env.NATS_STREAM_REPLICAS);

  if (!Number.isInteger(replicas) || replicas < 1) {
    throw new Error("NATS_STREAM_REPLICAS must be a positive integer");
  }

  return replicas;
}

/**
 * @typedef {Awaited<ReturnType<typeof createRuntime>>} WorkerRuntime
 */
