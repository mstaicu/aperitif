import createError from "http-errors";

import { authenticateAccessToken } from "../sessions/authenticate.mjs";
import {
  consumeRegistrationChallenge,
  storePasskey,
  verifyRegistration,
} from "./registration.mjs";

/**
 * Adds a registered passkey to the principal identified by a valid live session.
 * @param {{ pool: import("pg").Pool, origin: string, jwks: import("jose").JWTVerifyGetKey }} resources
 * @param {{
 *   authorization: string,
 *   credential: import("@simplewebauthn/server").RegistrationResponseJSON,
 *   name?: string,
 * }} args
 */
export async function addPasskey(
  { jwks, origin, pool },
  { authorization, credential, name },
) {
  const client = await pool.connect();

  try {
    const registrationChallenge = await consumeRegistrationChallenge(
      { client },
      credential,
    );

    await client.query("BEGIN");

    // Serialize credential changes before checking whether the session is still live.
    await client.query(
      `
        SELECT id
        FROM principals
        WHERE id = $1
        FOR NO KEY UPDATE
      `,
      [registrationChallenge.principal_id],
    );
    const principalId = await authenticateAccessToken({
      authorization,
      jwks,
      pool: client,
    });

    if (registrationChallenge.principal_id !== principalId) {
      throw new createError.UnprocessableEntity();
    }

    const verifiedCredential = await verifyRegistration(
      { origin },
      credential,
      registrationChallenge.challenge,
    );
    await storePasskey(
      { client },
      { credential: verifiedCredential, name, principalId },
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
