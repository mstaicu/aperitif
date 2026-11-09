import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
} from "@simplewebauthn/server";
import createError from "http-errors";

import { authenticateAccessToken } from "../sessions/authenticate.mjs";

/**
 * @param {{ origin: string, pool: import("pg").Pool, jwks: import("jose").JWTVerifyGetKey }} resources
 * @param {{ authorization?: string }} args
 */
export async function createPasskeyAdditionOptions(
  { jwks, origin, pool },
  { authorization },
) {
  const session = await authenticateAccessToken(
    { jwks, pool },
    { authorization },
  );

  const { rows: credentials } = await pool.query(
    `
      SELECT credential_id
      FROM passkey_credentials
      WHERE principal_id = $1
    `,
    [session.principal_id],
  );

  const { hostname } = new URL(origin);

  const options = {
    authentication: await generateAuthenticationOptions({
      rpID: hostname,
      userVerification: "required",
    }),
    registration: await generateRegistrationOptions({
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      excludeCredentials: credentials.map(({ credential_id }) => ({
        id: credential_id,
      })),
      rpID: hostname,
      rpName: hostname,
      userDisplayName: session.principal_id,
      userID: Buffer.from(session.principal_id),
      userName: session.principal_id,
    }),
  };

  const { rowCount } = await pool.query(
    `
      INSERT INTO passkey_addition_challenges (
        authentication_challenge,
        registration_challenge,
        session_id
      )
      SELECT $1, $2, id
      FROM sessions
      WHERE id = $3
        AND principal_id = $4
        AND expires_at > clock_timestamp()
      FOR KEY SHARE
    `,
    [
      options.authentication.challenge,
      options.registration.challenge,
      session.id,
      session.principal_id,
    ],
  );

  if (!rowCount) throw new createError.Unauthorized();

  return options;
}
