import { generateAuthenticationOptions } from "@simplewebauthn/server";
import createError from "http-errors";
import { randomBytes } from "node:crypto";

import { authenticateAccessToken } from "../sessions/authenticate.mjs";

/**
 * @param {{ origin: string, pool: import("pg").Pool, jwks: import("jose").JWTVerifyGetKey }} resources
 * @param {{ authorization?: string, id: string }} args
 */
export async function createRemovalOptions(
  { jwks, origin, pool },
  { authorization, id },
) {
  const session = await authenticateAccessToken(
    { jwks, pool },
    { authorization },
  );

  const challenge = randomBytes(32);

  const { rowCount } = await pool.query(
    `
      INSERT INTO passkey_removal_challenges (challenge, session_id, credential_id)
      SELECT $1, sessions.id, passkey_credentials.id
      FROM passkey_credentials
      JOIN sessions ON sessions.principal_id = passkey_credentials.principal_id
      WHERE passkey_credentials.id = $3
        AND sessions.id = $2
        AND passkey_credentials.principal_id = $4
        AND sessions.expires_at > clock_timestamp()
      FOR KEY SHARE OF passkey_credentials, sessions
    `,
    [challenge, session.id, id, session.principal_id],
  );

  if (!rowCount) throw new createError.NotFound();

  return generateAuthenticationOptions({
    challenge,
    rpID: new URL(origin).hostname,
    userVerification: "required",
  });
}
