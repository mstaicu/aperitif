import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @param {string} [principalId]
 */
export const createRegistrationOptions = async (
  { origin, pool },
  principalId,
) => {
  const challenge = randomBytes(32);

  const {
    rows: [registrationChallenge],
  } = await pool.query(
    `
      INSERT INTO passkey_registration_challenges (
        challenge,
        principal_id
      )
      VALUES ($1, COALESCE($2::uuid, gen_random_uuid()))
      RETURNING principal_id
    `,
    [challenge, principalId ?? null],
  );

  const { rows: credentials } = await pool.query(
    `
      SELECT credential_id 
      FROM passkey_credentials 
      WHERE principal_id = $1
    `,
    [registrationChallenge.principal_id],
  );

  const { hostname } = new URL(origin);
  const webauthnUserHandle = Buffer.from(
    registrationChallenge.principal_id.replace(/-/g, ""),
    "hex",
  );

  return generateRegistrationOptions({
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    challenge,
    excludeCredentials: credentials.map(({ credential_id }) => ({
      id: credential_id.toString("base64url"),
    })),
    rpID: hostname,
    rpName: hostname,
    timeout: 60000,
    userDisplayName: registrationChallenge.principal_id,
    userID: webauthnUserHandle,
    userName: registrationChallenge.principal_id,
  });
};
