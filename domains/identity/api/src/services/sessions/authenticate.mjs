import createError from "http-errors";
import { jwtVerify } from "jose";
import { createHash } from "node:crypto";

/**
 * @param {{ jwks: import("jose").JWTVerifyGetKey, pool: import("pg").Pool | import("pg").PoolClient }} resources
 * @param {{ authorization?: string }} args
 */
export async function authenticateAccessToken(
  { jwks, pool },
  { authorization },
) {
  const [type, token, extra] = (authorization ?? "").split(/ +/);

  if (type.toLowerCase() !== "bearer" || !token || extra) {
    throw new createError.Unauthorized();
  }

  let payload;

  try {
    ({ payload } = await jwtVerify(token, jwks, {
      requiredClaims: ["sub", "sid", "exp"],
    }));
  } catch {
    throw new createError.Unauthorized();
  }

  const {
    rows: [session],
  } = await pool.query(
    `
      SELECT id, principal_id
      FROM sessions
      WHERE id = $1
        AND principal_id = $2
        AND expires_at > clock_timestamp()
    `,
    [payload.sid, payload.sub],
  );

  if (!session) {
    throw new createError.Unauthorized();
  }

  return /** @type {{ id: string, principal_id: string }} */ (session);
}

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @param {{ authorization?: string }} args
 */
export async function authenticateSession({ pool }, { authorization }) {
  const [scheme, token, extra] = (authorization ?? "").split(/ +/);

  if (scheme.toLowerCase() !== "bearer" || !token || extra) {
    throw new createError.Unauthorized();
  }

  const {
    rows: [session],
  } = await pool.query(
    `
      SELECT id,
        principal_id,
        expires_at
      FROM sessions
      WHERE token_hash = $1
        AND expires_at > clock_timestamp()
    `,
    [createHash("sha256").update(token).digest()],
  );

  if (!session) {
    throw new createError.Unauthorized();
  }

  return session;
}
