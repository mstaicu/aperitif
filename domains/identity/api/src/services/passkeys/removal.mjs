import {
  buildCredentialRemovedV1,
  buildSessionRevokedV1,
  CredentialRemovedV1Subject,
  SessionRevokedV1Subject,
} from "@mstaicu/identity-contracts";
import { context, propagation } from "@opentelemetry/api";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import createError from "http-errors";

import { authenticateAccessToken } from "../sessions/authenticate.mjs";

/**
 * @param {{ pool: import("pg").Pool, origin: string, jwks: import("jose").JWTVerifyGetKey }} resources
 * @param {{ id: string, authentication: import("@simplewebauthn/server").AuthenticationResponseJSON, authorization?: string }} args
 */
export async function completePasskeyRemoval(
  { jwks, origin, pool },
  { authentication, authorization, id },
) {
  let challenge;

  try {
    ({ challenge } = decodeClientDataJSON(
      authentication.response.clientDataJSON,
    ));
  } catch {
    throw new createError.BadRequest();
  }

  // Consume before the transaction so failure cannot restore the removal proof.
  const {
    rows: [attempt],
  } = await pool.query(
    `
      DELETE FROM passkey_removal_challenges
      WHERE challenge = $1 AND credential_id = $2 AND expires_at > clock_timestamp()
      RETURNING session_id
    `,
    [challenge, id],
  );

  if (!attempt) throw new createError.UnprocessableEntity();

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
    const passkeyPrincipalId = storedCredential.principal_id;

    const session = await authenticateAccessToken(
      { jwks, pool: client },
      { authorization },
    );

    const principalId = session.principal_id;

    if (
      session.id !== attempt.session_id ||
      passkeyPrincipalId !== principalId
    ) {
      throw new createError.UnprocessableEntity();
    }

    const { rows: passkeys } = await client.query(
      `
        SELECT id
        FROM passkey_credentials
        WHERE principal_id = $1
      `,
      [principalId],
    );

    if (!passkeys.some((passkey) => passkey.id === id.toLowerCase())) {
      throw new createError.NotFound();
    }

    if (passkeys.length === 1) {
      throw new createError.Conflict(
        "The final authentication method cannot be removed",
      );
    }

    const {
      rows: [removed],
    } = await client.query(
      `
        DELETE FROM passkey_credentials
        WHERE id = $1
          AND principal_id = $2
        RETURNING id, clock_timestamp()::text AS occurred_at
      `,
      [id, principalId],
    );

    // Keep the database clock's full precision when selecting affected sessions.
    const { rows: sessions } = await client.query(
      `
        DELETE FROM sessions WHERE principal_id = $1
        RETURNING id, expires_at > $2::timestamptz AS active
      `,
      [principalId, removed.occurred_at],
    );

    const headers = {
      "Content-Type": "application/cloudevents+json",
    };
    propagation.inject(context.active(), headers);

    const time = new Date(removed.occurred_at).toISOString();

    const credentialRemovedEvent = buildCredentialRemovedV1({
      data: {
        credential_id: removed.id,
        principal_id: principalId,
      },
      time,
    });

    await client.query(
      `
        INSERT INTO outbox_messages (id, subject, payload, headers)
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
      `,
      [
        credentialRemovedEvent.id,
        CredentialRemovedV1Subject,
        credentialRemovedEvent,
        headers,
      ],
    );

    for (const session of sessions) {
      if (!session.active) continue;

      const sessionRevokedEvent = buildSessionRevokedV1({
        data: {
          principal_id: principalId,
          session_id: session.id,
        },
        time,
      });

      await client.query(
        `
          INSERT INTO outbox_messages (id, subject, payload, headers)
          VALUES ($1, $2, $3::jsonb, $4::jsonb)
        `,
        [
          sessionRevokedEvent.id,
          SessionRevokedV1Subject,
          sessionRevokedEvent,
          headers,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
