import { createHash } from "node:crypto";

import { generateRefreshToken } from "../shared.mjs";

/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { refresh_token: string }) => Promise<{ refresh_token: string }>}
 */
export const refresh =
  (ctx) =>
  async ({ refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const client = await ctx.db.connect();

    try {
      await client.query("BEGIN");

      const {
        rows: [session],
      } = await client.query(
        `
          SELECT id, user_id
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
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };
