import { createNats } from "./nats.mjs";
import { createPostgres } from "./postgres.mjs";

export const createRuntime = async () => {
  const postgres = createPostgres();

  try {
    const streamReplicas = getStreamReplicas();
    const nats = await createNats();

    return {
      app: {
        region: process.env.REGION ?? "local",
        streamReplicas,
      },
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
      persistence: {
        db: postgres.db,
      },
    };
  } catch (err) {
    await postgres.close().catch(() => {});
    throw err;
  }
};

function getStreamReplicas() {
  const replicas = Number(process.env.NATS_STREAM_REPLICAS);

  if (!Number.isInteger(replicas) || replicas < 1) {
    throw new Error("NATS_STREAM_REPLICAS must be a positive integer");
  }

  return replicas;
}

/**
 * @typedef {Awaited<ReturnType<typeof createRuntime>>} WorkerRuntime
 */
