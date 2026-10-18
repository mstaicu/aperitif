import { jwtVerify } from "jose";
import { createHash } from "node:crypto";

/**
 * @param {{ authorization?: string, jwks: import("jose").JWTVerifyGetKey, pool: import("pg").Pool | import("pg").PoolClient }} args
 */
export async function authenticateAccessToken({ authorization, jwks, pool }) {
  const [type, token, extra] = (authorization ?? "").split(" ");

  if (type !== "Bearer" || !token || extra) {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  let payload;

  try {
    ({ payload } = await jwtVerify(token, jwks, {
      requiredClaims: ["sub", "sid", "exp"],
    }));
  } catch {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  const {
    rows: [session],
  } = await pool.query(
    `
      SELECT principal_id
      FROM sessions
      WHERE id = $1
        AND principal_id = $2
        AND expires_at > NOW()
    `,
    [payload.sid, payload.sub],
  );

  if (!session) {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  return session.principal_id;
}

/**
 * @param {{ authorization?: string, pool: import("pg").Pool }} args
 */
export async function authenticateSession({ authorization, pool }) {
  const [scheme, token, extra] = (authorization ?? "").split(" ");

  if (scheme !== "Bearer" || !token || extra) {
    throw new Error("INVALID_AUTHORIZATION_HEADER");
  }

  const {
    rows: [session],
  } = await pool.query(
    `
      SELECT id, principal_id, expires_at
      FROM sessions
      WHERE token_hash = $1
        AND expires_at > NOW()
    `,
    [createHash("sha256").update(token).digest()],
  );

  if (!session) {
    throw new Error("INVALID_SESSION_TOKEN");
  }

  return session;
}
