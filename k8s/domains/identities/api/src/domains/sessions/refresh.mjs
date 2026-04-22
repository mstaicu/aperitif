import { createHash, randomBytes } from "node:crypto";

import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

const generateRefreshToken = () => {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest();

  return { hash, token };
};

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { refresh_token: string }) => Promise<{ refresh_token: string }>}
 */
export const refresh =
  (ctx) =>
  async ({ refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [session],
      } = await client.query(
        `
          SELECT id
          FROM sessions
          WHERE refresh_token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
          FOR UPDATE
        `,
        [createHash("sha256").update(refresh_token).digest()],
      );

      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      const { hash, token } = generateRefreshToken();

      await client.query(
        `
          UPDATE sessions
          SET
            refresh_token_hash = $2,
            last_refreshed_at = NOW()
          WHERE id = $1
        `,
        [session.id, hash],
      );

      await client.query("COMMIT");

      return {
        refresh_token: token,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };
