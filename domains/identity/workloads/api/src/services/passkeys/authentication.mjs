import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import createError from "http-errors";

import { createSession } from "../sessions/create.mjs";

/**
 * Authenticates an existing passkey and creates a session atomically.
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @param {{ authentication: import("@simplewebauthn/server").AuthenticationResponseJSON }} args
 */
export async function authenticateWithPasskey(
  { origin, pool },
  { authentication },
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

  const challengeBytes = Buffer.from(challenge, "base64url");

  // Consume before the transaction so a failed authentication cannot restore its proof.
  const { rowCount } = await pool.query(
    `
      DELETE FROM passkey_authentication_challenges
      WHERE challenge = $1
        AND expires_at > NOW()
    `,
    [challengeBytes],
  );

  if (!rowCount) {
    throw new createError.UnprocessableEntity();
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
      [credentialId],
    );

    if (!storedCredential) {
      throw new createError.UnprocessableEntity();
    }

    const expectedHandle = Buffer.from(
      storedCredential.principal_id.replace(/-/g, ""),
      "hex",
    ).toString("base64url");

    if (authentication.response.userHandle !== expectedHandle) {
      throw new createError.UnprocessableEntity();
    }

    const { hostname, origin: expectedOrigin } = new URL(origin);

    const authenticationVerification = await verifyAuthenticationResponse({
      credential: {
        counter: Number(storedCredential.sign_count),
        id: storedCredential.credential_id.toString("base64url"),
        publicKey: new Uint8Array(storedCredential.public_key),
      },
      expectedChallenge: challengeBytes.toString("base64url"),
      expectedOrigin,
      expectedRPID: hostname,
      requireUserVerification: true,
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
