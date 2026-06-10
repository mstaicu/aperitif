import { createNats } from "./nats.mjs";
import { createPostgres } from "./postgres.mjs";

export const createRuntime = async () => {
  const postgres = createPostgres();

  try {
    const nats = await createNats();

    return {
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

/**
 * @typedef {Awaited<ReturnType<typeof createRuntime>>} WorkerRuntime
 */
