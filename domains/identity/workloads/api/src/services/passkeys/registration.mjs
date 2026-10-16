import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import { DatabaseError } from "pg";

import { createSession } from "../sessions/create.mjs";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @param {{
 *   credential: import("@simplewebauthn/server").RegistrationResponseJSON,
 *   name?: string,
 *   principalId?: string,
 * }} args
 */
export const register = async (
  { origin, pool },
  { credential, name, principalId },
) => {
  if (!name || name.length < 1 || name.length > 100) {
    throw new Error("INVALID_PASSKEY_NAME");
  }

  let challenge;

  try {
    ({ challenge } = decodeClientDataJSON(credential.response.clientDataJSON));
  } catch {
    throw new Error("INVALID_REGISTRATION_RESPONSE");
  }

  if (typeof challenge !== "string") {
    throw new Error("INVALID_REGISTRATION_RESPONSE");
  }

  const {
    rows: [challengeRow],
  } = await pool.query(
    `
      DELETE FROM registration_challenges
      WHERE challenge = $1
        AND expires_at > NOW()
      RETURNING principal_id, challenge
    `,
    [Buffer.from(challenge, "base64url")],
  );

  if (
    !challengeRow ||
    (principalId && challengeRow.principal_id !== principalId)
  ) {
    throw new Error("REGISTRATION_VERIFICATION_FAILED");
  }

  const { hostname, origin: expectedOrigin } = new URL(origin);

  let verification;

  try {
    verification = await verifyRegistrationResponse({
      expectedChallenge: challengeRow.challenge.toString("base64url"),
      expectedOrigin,
      expectedRPID: hostname,
      requireUserVerification: true,
      response: credential,
    });
  } catch {
    throw new Error("REGISTRATION_VERIFICATION_FAILED");
  }

  if (!verification.verified) {
    throw new Error("REGISTRATION_VERIFICATION_FAILED");
  }

  const registrationCredential = verification.registrationInfo.credential;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (!principalId) {
      const {
        rows: [principal],
      } = await client.query(
        `
          INSERT INTO principals (id)
          VALUES ($1)
          ON CONFLICT DO NOTHING
          RETURNING id
        `,
        [challengeRow.principal_id],
      );

      if (!principal) {
        throw new Error("USER_ALREADY_REGISTERED");
      }
    }

    await client.query(
      `
        INSERT INTO passkey_credentials (
          principal_id,
          credential_id,
          name,
          public_key,
          sign_count
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        challengeRow.principal_id,
        Buffer.from(registrationCredential.id, "base64url"),
        name,
        Buffer.from(registrationCredential.publicKey),
        registrationCredential.counter,
      ],
    );

    if (principalId) {
      await client.query("COMMIT");
      return null;
    }

    const session = await createSession({
      client,
      principalId: challengeRow.principal_id,
    });

    await client.query("COMMIT");

    return {
      expires_in: session.expiresIn,
      session_token: session.sessionToken,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    if (err instanceof DatabaseError && err.code === "23505") {
      throw new Error("CREDENTIAL_ALREADY_EXISTS", {
        cause: err,
      });
    }

    throw err;
  } finally {
    client.release();
  }
};
