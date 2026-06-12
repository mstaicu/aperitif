import { createPostgres } from "./postgres.mjs";
import { createSecurityContext } from "./security/index.mjs";

export const createRuntime = async () => {
  const postgres = createPostgres();

  try {
    const security = createSecurityContext();

    return {
      db: postgres.db,
      lifecycle: {
        close: () => postgres.close(),
      },
      security,
    };
  } catch (err) {
    await postgres.close().catch(() => {});
    throw err;
  }
};

/**
 * @typedef {Awaited<ReturnType<typeof createRuntime>>} Runtime
 */
