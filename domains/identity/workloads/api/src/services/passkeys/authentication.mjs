import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import createError from "http-errors";

import { createSession } from "../sessions/create.mjs";

/**
 * Deletes and returns the challenge. Call before BEGIN.
 * @param {{ client: import("pg").PoolClient }} resources
 * @param {import("@simplewebauthn/server").AuthenticationResponseJSON} authentication
 */
export async function consumeAuthenticationChallenge(
  { client },
  authentication,
) {
  let challenge;

  try {
    ({ challenge } = decodeClientDataJSON(
      authentication.response.clientDataJSON,
    ));
  } catch {
    throw new createError.BadRequest();
  }

  if (typeof challenge !== "string") {
    throw new createError.BadRequest();
  }

  const {
    rows: [challengeRow],
  } = await client.query(
    `
      DELETE FROM passkey_authentication_challenges
      WHERE challenge = $1
        AND expires_at > NOW()
      RETURNING challenge
    `,
    [Buffer.from(challenge, "base64url")],
  );

  if (!challengeRow) {
    throw new createError.UnprocessableEntity();
  }

  return challengeRow.challenge.toString("base64url");
}

/**
 * Verifies a single-use passkey proof and creates a session in one transaction.
 * @param {{ pool: import("pg").Pool, origin: string }} resources
 * @param {import("@simplewebauthn/server").AuthenticationResponseJSON} authentication
 */
export async function signInWithPasskey({ origin, pool }, authentication) {
  const client = await pool.connect();

  try {
    const challenge = await consumeAuthenticationChallenge(
      { client },
      authentication,
    );

    await client.query("BEGIN");

    const principalId = await verifyPasskey(
      { client, origin },
      authentication,
      challenge,
    );
    const session = await createSession({ client, principalId });

    await client.query("COMMIT");

    return session;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verifies the proof, advances the credential counter and returns its principal.
 * Requires an active transaction. Holds the principal lock until it ends;
 * callers must check any required live session after this verification.
 * @param {{ client: import("pg").PoolClient, origin: string }} resources
 * @param {import("@simplewebauthn/server").AuthenticationResponseJSON} authentication
 * @param {string} challenge
 */
export async function verifyPasskey(
  { client, origin },
  authentication,
  challenge,
) {
  const credentialId = Buffer.from(authentication.id, "base64url");

  await client.query(
    `
      SELECT id
      FROM principals
      WHERE id = (
        SELECT principal_id
        FROM passkey_credentials
        WHERE credential_id = $1
      )
      FOR NO KEY UPDATE
    `,
    [credentialId],
  );

  const {
    rows: [credential],
  } = await client.query(
    `
      SELECT principal_id,
        credential_id,
        public_key,
        sign_count
      FROM passkey_credentials
      WHERE credential_id = $1
    `,
    [credentialId],
  );

  if (!credential) {
    throw new createError.UnprocessableEntity();
  }

  const expectedHandle = Buffer.from(
    credential.principal_id.replace(/-/g, ""),
    "hex",
  ).toString("base64url");

  if (authentication.response.userHandle !== expectedHandle) {
    throw new createError.UnprocessableEntity();
  }

  const { hostname, origin: expectedOrigin } = new URL(origin);

  let verification;

  try {
    verification = await verifyAuthenticationResponse({
      credential: {
        counter: Number(credential.sign_count),
        id: credential.credential_id.toString("base64url"),
        publicKey: new Uint8Array(credential.public_key),
      },
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: hostname,
      requireUserVerification: true,
      response: authentication,
    });
  } catch {
    throw new createError.UnprocessableEntity();
  }

  if (!verification.verified) {
    throw new createError.UnprocessableEntity();
  }

  await client.query(
    `
      UPDATE passkey_credentials
      SET sign_count = $2
      WHERE credential_id = $1
    `,
    [credential.credential_id, verification.authenticationInfo.newCounter],
  );

  return /** @type {string} */ (credential.principal_id);
}
