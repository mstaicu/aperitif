import {
  buildCredentialAddedV1,
  buildPrincipalRegisteredV1,
  CredentialAddedV1Subject,
  PrincipalRegisteredV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import createError from "http-errors";

import { createSession } from "../sessions/create.mjs";

/**
 * Deletes and returns the challenge. Call before BEGIN.
 * @param {{ client: import("pg").PoolClient }} resources
 * @param {import("@simplewebauthn/server").RegistrationResponseJSON} credential
 */
export const getRegistrationChallenge = async ({ client }, credential) => {
  let challenge;

  try {
    ({ challenge } = decodeClientDataJSON(credential.response.clientDataJSON));
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
      DELETE FROM passkey_registration_challenges
      WHERE challenge = $1
        AND expires_at > NOW()
      RETURNING principal_id, challenge
    `,
    [Buffer.from(challenge, "base64url")],
  );

  if (!challengeRow) {
    throw new createError.UnprocessableEntity();
  }

  return /** @type {{ principal_id: string, challenge: Buffer }} */ (
    challengeRow
  );
};

/**
 * Requires the caller's active transaction. For additions, the caller must first
 * lock the principal, verify their existing passkey, and validate their session.
 * @param {{ client: import("pg").PoolClient, origin: string }} resources
 * @param {{
 *   challenge: { principal_id: string, challenge: Buffer },
 *   credential: import("@simplewebauthn/server").RegistrationResponseJSON,
 *   name?: string,
 *   principalId?: string,
 * }} args
 */
export const register = async (
  { client, origin },
  { challenge: challengeRow, credential, name = "Passkey", principalId },
) => {
  if (!name || name.length < 1 || [...name].length > 100) {
    throw new createError.BadRequest();
  }

  if (principalId && challengeRow.principal_id !== principalId) {
    throw new createError.UnprocessableEntity();
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
    throw new createError.UnprocessableEntity();
  }

  if (!verification.verified) {
    throw new createError.UnprocessableEntity();
  }

  const registrationCredential = verification.registrationInfo.credential;

  const headers = {
    "Content-Type": "application/cloudevents+json",
  };
  propagation.inject(context.active(), headers);

  if (!principalId) {
    const {
      rows: [principal],
    } = await client.query(
      `
        INSERT INTO principals (id)
        VALUES ($1)
        ON CONFLICT DO NOTHING
        RETURNING id, created_at
      `,
      [challengeRow.principal_id],
    );

    if (!principal) {
      throw new createError.UnprocessableEntity();
    }
    const principalRegisteredEvent = buildPrincipalRegisteredV1({
      data: {
        principal_id: principal.id,
      },
      time: principal.created_at.toISOString(),
    });
    await client.query(
      `
        INSERT INTO outbox_messages (id, subject, payload, headers)
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
      `,
      [
        principalRegisteredEvent.id,
        PrincipalRegisteredV1Subject,
        principalRegisteredEvent,
        headers,
      ],
    );
  }

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
      challengeRow.principal_id,
      Buffer.from(registrationCredential.id, "base64url"),
      name,
      Buffer.from(registrationCredential.publicKey),
      registrationCredential.counter,
    ],
  );

  if (!passkey) throw new createError.UnprocessableEntity();

  const credentialAddedEvent = buildCredentialAddedV1({
    data: {
      credential_ref: passkey.id,
      principal_id: challengeRow.principal_id,
    },
    time: passkey.created_at.toISOString(),
  });
  await client.query(
    `
      INSERT INTO outbox_messages (id, subject, payload, headers)
      VALUES ($1, $2, $3::jsonb, $4::jsonb)
    `,
    [
      credentialAddedEvent.id,
      CredentialAddedV1Subject,
      credentialAddedEvent,
      headers,
    ],
  );

  if (principalId) {
    return null;
  }

  return createSession({
    client,
    principalId: challengeRow.principal_id,
  });
};
