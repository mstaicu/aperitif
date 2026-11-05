import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
} from "@simplewebauthn/server";
import createError from "http-errors";
import { randomBytes } from "node:crypto";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @param {{ session: { id: string, principal_id: string } }} args
 */
export async function createAdditionOptions({ origin, pool }, { session }) {
  const authenticationChallenge = randomBytes(32);
  const registrationChallenge = randomBytes(32);

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
      authenticationChallenge,
      registrationChallenge,
      session.id,
      session.principal_id,
    ],
  );

  if (!rowCount) throw new createError.Unauthorized();

  const { rows: credentials } = await pool.query(
    `
      SELECT credential_id
      FROM passkey_credentials
      WHERE principal_id = $1
    `,
    [session.principal_id],
  );

  const { hostname } = new URL(origin);

  return {
    authentication: await generateAuthenticationOptions({
      challenge: authenticationChallenge,
      rpID: hostname,
      userVerification: "required",
    }),
    registration: await generateRegistrationOptions({
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      challenge: registrationChallenge,
      excludeCredentials: credentials.map(({ credential_id }) => ({
        id: credential_id.toString("base64url"),
      })),
      rpID: hostname,
      rpName: hostname,
      userDisplayName: session.principal_id,
      userID: Buffer.from(session.principal_id.replace(/-/g, ""), "hex"),
      userName: session.principal_id,
    }),
  };
}
