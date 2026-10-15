import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @param {{ principalId: string }} args
 */
export async function createPasskeyOptions({ origin, pool }, { principalId }) {
  const challenge = randomBytes(32);

  await pool.query(
    `
      INSERT INTO registration_challenges (
        challenge,
        principal_id
      )
      VALUES ($1, $2)
    `,
    [challenge, principalId],
  );

  const { rows: credentials } = await pool.query(
    `
      SELECT credential_id
      FROM passkey_credentials
      WHERE principal_id = $1
    `,
    [principalId],
  );
  const excludeCredentials = credentials.map((credential) => ({
    id: credential.credential_id.toString("base64url"),
  }));
  const { hostname } = new URL(origin);

  return generateRegistrationOptions({
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    challenge,
    excludeCredentials,
    rpID: hostname,
    rpName: hostname,
    timeout: 60000,
    userDisplayName: principalId,
    userID: Buffer.from(principalId.replaceAll("-", ""), "hex"),
    userName: principalId,
  });
}
