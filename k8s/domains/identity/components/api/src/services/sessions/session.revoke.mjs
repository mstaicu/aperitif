import { createHash } from "node:crypto";
import { DatabaseError } from "pg";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: { refresh_token: string }) => Promise<void>}
 */
export const revokeSession =
  ({ pool }) =>
  async ({ refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const tokenHash = createHash("sha256").update(refresh_token).digest();

    try {
      const {
        rows: [session],
      } = await pool.query(
        `
          UPDATE sessions
          SET revoked_at = NOW()
          WHERE token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
          RETURNING id
        `,
        [tokenHash],
      );

      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      console.log(
        JSON.stringify({
          event: "session_revoked",
          level: "info",
          reason: "logout",
          session_id: session.id,
        }),
      );
    } catch (err) {
      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (Error.isError(err) &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    }
  };
