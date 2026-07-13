import { SignJWT } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { DatabaseError } from "pg";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   signingKey: import("../../platform/security/index.mjs").JwtKeys["signingKey"],
 * }} resources
 * @returns {(args: { refresh_token: string }) => Promise<{ access_token: string, refresh_token: string }>}
 */
export const createAccessToken =
  ({ db, signingKey }) =>
  async ({ refresh_token }) => {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const currentTokenHash = createHash("sha256")
      .update(refresh_token)
      .digest();

    let client;
    let transactionOpen = false;

    try {
      client = await db.connect();
      await client.query("BEGIN");
      transactionOpen = true;

      const {
        rows: [session],
      } = await client.query(
        `
          SELECT
            rt.token_hash,
            rt.session_id,
            rt.consumed_at,
            s.user_id,
            s.revoked_at AS session_revoked_at,
            s.expires_at > NOW() AS session_active,
            EXISTS (
              SELECT 1
              FROM operators o
              WHERE o.user_id = s.user_id
            ) AS operator
          FROM session_refresh_tokens rt
          JOIN sessions s ON s.id = rt.session_id
          WHERE rt.token_hash = $1
          FOR UPDATE OF rt, s
        `,
        [currentTokenHash],
      );

      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      if (session.consumed_at) {
        await client.query(
          `
            UPDATE sessions
            SET revoked_at = COALESCE(revoked_at, NOW())
            WHERE id = $1
          `,
          [session.session_id],
        );

        await client.query("COMMIT");
        transactionOpen = false;

        console.warn(
          JSON.stringify({
            event: "session_revoked",
            level: "warn",
            reason: "refresh_token_reuse",
            session_id: session.session_id,
          }),
        );

        throw new Error("SESSION_NOT_FOUND");
      }

      if (session.session_revoked_at || !session.session_active) {
        throw new Error("SESSION_NOT_FOUND");
      }

      const nextRefreshToken = randomBytes(32).toString("base64url");
      const nextTokenHash = createHash("sha256")
        .update(nextRefreshToken)
        .digest();

      await client.query(
        `
          UPDATE session_refresh_tokens
          SET consumed_at = NOW()
          WHERE token_hash = $1
        `,
        [session.token_hash],
      );

      await client.query(
        `
          INSERT INTO session_refresh_tokens (
            session_id,
            token_hash
          )
          VALUES ($1, $2)
        `,
        [session.session_id, nextTokenHash],
      );

      await client.query(
        `
          UPDATE sessions
          SET last_refreshed_at = NOW()
          WHERE id = $1
        `,
        [session.session_id],
      );

      const now = Math.floor(Date.now() / 1000);

      /**
       * @type {{ operator?: true, sub: string }}
       */
      let claims = {
        sub: session.user_id,
      };

      if (session.operator) {
        claims.operator = true;
      }

      const access_token = await new SignJWT(claims)
        .setProtectedHeader({
          alg: "ES256",
          kid: signingKey.kid,
        })
        .setIssuedAt(now)
        .setExpirationTime(now + 60)
        .sign(signingKey.privateKey);

      await client.query("COMMIT");
      transactionOpen = false;

      console.log(
        JSON.stringify({
          event: "session_refreshed",
          level: "info",
          session_id: session.session_id,
        }),
      );

      return {
        access_token,
        refresh_token: nextRefreshToken,
      };
    } catch (err) {
      if (transactionOpen) {
        await client?.query("ROLLBACK").catch(() => {});
      }

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
