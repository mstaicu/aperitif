import {
  buildCredentialAddedV1,
  CredentialAddedV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";
import {
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import createError from "http-errors";

import { authenticateAccessToken } from "../sessions/authenticate.mjs";

/**
 * @param {{ pool: import("pg").Pool, origin: string, jwks: import("jose").JWTVerifyGetKey }} resources
 * @param {{ authorization?: string, authentication: import("@simplewebauthn/server").AuthenticationResponseJSON, registration: import("@simplewebauthn/server").RegistrationResponseJSON, name?: string }} args
 */
export async function completePasskeyAddition(
  { jwks, origin, pool },
  { authentication, authorization, name = "Passkey", registration },
) {
  let authenticationChallenge;

  try {
    authenticationChallenge = decodeClientDataJSON(
      authentication.response.clientDataJSON,
    ).challenge;
  } catch {
    throw new createError.BadRequest();
  }

  // Consume the pair before the transaction: a failed attempt cannot restore either proof.
  const {
    rows: [attempt],
  } = await pool.query(
    `
      DELETE FROM passkey_addition_challenges
      WHERE authentication_challenge = $1
        AND expires_at > clock_timestamp()
      RETURNING registration_challenge, session_id
    `,
    [authenticationChallenge],
  );

  if (!attempt) throw new createError.UnprocessableEntity();

  const { hostname, origin: expectedOrigin } = new URL(origin);

  const verification = await verifyRegistrationResponse({
    expectedChallenge: attempt.registration_challenge,
    expectedOrigin,
    expectedRPID: hostname,
    response: registration,
  }).catch(() => {
    throw new createError.UnprocessableEntity();
  });

  if (!verification.verified) {
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

    const authenticationVerification = await verifyAuthenticationResponse({
      credential: {
        counter: Number(storedCredential.sign_count),
        id: storedCredential.credential_id,
        publicKey: new Uint8Array(storedCredential.public_key),
      },
      expectedChallenge: authenticationChallenge,
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

    // Recheck the live session after acquiring the principal lock.
    const session = await authenticateAccessToken(
      { jwks, pool: client },
      { authorization },
    );

    if (
      session.id !== attempt.session_id ||
      session.principal_id !== principalId
    ) {
      throw new createError.UnprocessableEntity();
    }

    const verifiedCredential = verification.registrationInfo.credential;

    const {
      rows: [passkey],
    } = await client.query(
      `
        INSERT INTO passkey_credentials (
          principal_id,
          credential_id,
          name,
          public_key,
          sign_count
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (credential_id) DO NOTHING
        RETURNING id, created_at
      `,
      [
        principalId,
        verifiedCredential.id,
        name,
        verifiedCredential.publicKey,
        verifiedCredential.counter,
      ],
    );

    if (!passkey) throw new createError.UnprocessableEntity();

    const credentialAdded = buildCredentialAddedV1({
      data: { credential_id: passkey.id, principal_id: principalId },
      time: passkey.created_at.toISOString(),
    });

    const headers = { "Content-Type": "application/cloudevents+json" };
    propagation.inject(context.active(), headers);

    await client.query(
      `
        INSERT INTO outbox_messages (
          id, subject, payload, headers
        )
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
      `,
      [credentialAdded.id, CredentialAddedV1Subject, credentialAdded, headers],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
