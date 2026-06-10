import { createPostgres } from "./postgres.mjs";
import { createSecurityContext } from "./security/index.mjs";

export const createRuntime = async () => {
  const postgres = createPostgres();

  try {
    const security = await createSecurityContext();

    return {
      app: {
        origin: process.env.ORIGIN,
        region: process.env.REGION ?? "local",
      },
      lifecycle: {
        close: () => postgres.close(),
      },
      persistence: {
        db: postgres.db,
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
