import { createHash } from "node:crypto";
import { DatabaseError } from "pg";

/**
 * @param {{ db: import("pg").Pool }} resources
 * @returns {(args: { refresh_token: string }) => Promise<void>}
 */
export const revokeSession =
  ({ db }) =>
  async ({ refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const tokenHash = createHash("sha256").update(refresh_token).digest();

    let client;

    try {
      client = await db.connect();
      await client.query("BEGIN");

      const {
        rows: [refreshToken],
      } = await client.query(
        `
          SELECT
            rt.token_hash,
            rt.session_id,
            rt.consumed_at,
            s.revoked_at AS session_revoked_at
          FROM session_refresh_tokens rt
          JOIN sessions s ON s.id = rt.session_id
          WHERE rt.token_hash = $1
          FOR UPDATE OF rt, s
        `,
        [tokenHash],
      );

      if (!refreshToken?.session_id) {
        throw new Error("SESSION_NOT_FOUND");
      }

      if (refreshToken.consumed_at || refreshToken.session_revoked_at) {
        throw new Error("SESSION_NOT_FOUND");
      }

      await client.query(
        `
          UPDATE sessions
          SET revoked_at = COALESCE(revoked_at, NOW())
          WHERE id = $1
        `,
        [refreshToken.session_id],
      );

      await client.query(
        `
          UPDATE session_refresh_tokens
          SET consumed_at = COALESCE(consumed_at, NOW())
          WHERE token_hash = $1
        `,
        [refreshToken.token_hash],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          event: "session_revoked",
          level: "info",
          reason: "logout",
          session_id: refreshToken.session_id,
        }),
      );
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (err instanceof Error &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };
