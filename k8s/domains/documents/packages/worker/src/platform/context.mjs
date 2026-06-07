import { createNatsContext } from "./messaging/nats.mjs";
import { createPgContext } from "./persistence/pg.mjs";

export const createContext = async () => {
  const pg = createPgContext();

  try {
    const nats = await createNatsContext();

    return {
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
        nc: nats.nc,
      },
      persistence: {
        db: pg.db,
      },
    };
  } catch (err) {
    await pg.close().catch(() => {});
    throw err;
  }
};

/**
 * @typedef {Awaited<ReturnType<typeof createContext>>} WorkerContext
 */
