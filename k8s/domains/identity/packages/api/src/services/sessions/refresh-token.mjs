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
export const rotateRefreshToken =
  (ctx) =>
  async ({ refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const currentTokenHash = createHash("sha256")
      .update(refresh_token)
      .digest();

    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [refreshToken],
      } = await client.query(
        `
          SELECT
            rt.token_hash,
            rt.session_id,
            rt.consumed_at,
            s.revoked_at AS session_revoked_at,
            s.expires_at > NOW() AS session_active
          FROM session_refresh_tokens rt
          JOIN sessions s ON s.id = rt.session_id
          WHERE rt.token_hash = $1
          FOR UPDATE OF rt, s
        `,
        [currentTokenHash],
      );

      if (!refreshToken) {
        await client.query("ROLLBACK");
        throw new Error("SESSION_NOT_FOUND");
      }

      if (refreshToken.consumed_at) {
        await client.query(
          `
            UPDATE sessions
            SET revoked_at = COALESCE(revoked_at, NOW())
            WHERE id = $1
          `,
          [refreshToken.session_id],
        );

        await client.query("COMMIT");
        throw new Error("SESSION_NOT_FOUND");
      }

      if (refreshToken.session_revoked_at || !refreshToken.session_active) {
        await client.query("ROLLBACK");
        throw new Error("SESSION_NOT_FOUND");
      }

      const { hash, token } = generateRefreshToken();

      await client.query(
        `
          UPDATE session_refresh_tokens
          SET consumed_at = NOW()
          WHERE token_hash = $1
        `,
        [refreshToken.token_hash],
      );

      await client.query(
        `
          INSERT INTO session_refresh_tokens (
            session_id,
            token_hash
          )
          VALUES ($1, $2)
        `,
        [refreshToken.session_id, hash],
      );

      await client.query(
        `
          UPDATE sessions
          SET last_refreshed_at = NOW()
          WHERE id = $1
        `,
        [refreshToken.session_id],
      );

      await client.query("COMMIT");

      return {
        refresh_token: token,
      };
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };
