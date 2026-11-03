import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import createError from "http-errors";

/**
 * Deletes and returns the challenge. Call before BEGIN.
 * @param {{ client: import("pg").PoolClient }} resources
 * @param {import("@simplewebauthn/server").AuthenticationResponseJSON} authentication
 */
export const getAuthenticationChallenge = async (
  { client },
  authentication,
) => {
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
};

/**
 * Requires the caller's active transaction; holds the principal lock until it ends.
 * @param {{ client: import("pg").PoolClient, origin: string }} resources
 * @param {import("@simplewebauthn/server").AuthenticationResponseJSON} authentication
 * @param {string} challenge
 */
export const authenticate = async (
  { client, origin },
  authentication,
  challenge,
) => {
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
    [Buffer.from(authentication.id, "base64url")],
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
    [Buffer.from(authentication.id, "base64url")],
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

  const newCounter = verification.authenticationInfo.newCounter;

  await client.query(
    `
      UPDATE passkey_credentials
      SET sign_count = $2
      WHERE credential_id = $1
    `,
    [credential.credential_id, newCounter],
  );

  return /** @type {string} */ (credential.principal_id);
};
