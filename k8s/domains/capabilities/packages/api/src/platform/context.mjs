import { createPgContext } from "./persistence/pg.mjs";
import { createSecurityContext } from "./security/index.mjs";

export const createContext = async () => {
  const pg = createPgContext();

  try {
    const security = createSecurityContext();

    return {
      app: {
        region: process.env.REGION ?? "local",
      },
      lifecycle: {
        close: () => pg.close(),
      },
      persistence: {
        db: pg.db,
      },
      security,
    };
  } catch (err) {
    await pg.close().catch(() => {});
    throw err;
  }
};

/**
 * @typedef {Awaited<ReturnType<typeof createContext>>} Context
 */
