import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import createError from "http-errors";

import { createSession } from "../sessions/create.mjs";

/**
 * Authenticates an existing passkey and creates a session atomically.
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @param {import("@simplewebauthn/server").AuthenticationResponseJSON} authentication
 */
export async function completePasskeyAuthentication(
  { origin, pool },
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

  // Consume before the transaction so a failed authentication cannot restore its proof.
  const { rowCount } = await pool.query(
    `
      DELETE FROM passkey_authentication_challenges
      WHERE challenge = $1
        AND expires_at > NOW()
    `,
    [challenge],
  );

  if (!rowCount) {
    throw new createError.UnprocessableEntity();
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
      [authentication.id],
    );

    const {
      rows: [storedCredential],
    } = await client.query(
      `
        SELECT principal_id,
          credential_id,
          public_key,
          sign_count
        FROM passkey_credentials
        WHERE credential_id = $1
      `,
      [authentication.id],
    );

    if (!storedCredential) {
      throw new createError.UnprocessableEntity();
    }

    const expectedHandle = Buffer.from(storedCredential.principal_id).toString(
      "base64url",
    );

    if (authentication.response.userHandle !== expectedHandle) {
      throw new createError.UnprocessableEntity();
    }

    const { hostname, origin: expectedOrigin } = new URL(origin);

    const authenticationVerification = await verifyAuthenticationResponse({
      credential: {
        counter: Number(storedCredential.sign_count),
        id: storedCredential.credential_id,
        publicKey: storedCredential.public_key,
      },
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: hostname,
      response: authentication,
    }).catch(() => {
      throw new createError.UnprocessableEntity();
    });

    if (!authenticationVerification.verified) {
      throw new createError.UnprocessableEntity();
    }

    await client.query(
      `
        UPDATE passkey_credentials
        SET sign_count = $2
        WHERE credential_id = $1
      `,
      [
        storedCredential.credential_id,
        authenticationVerification.authenticationInfo.newCounter,
      ],
    );
    const principalId = storedCredential.principal_id;
    const session = await createSession({ client }, { principalId });

    await client.query("COMMIT");

    return session;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
