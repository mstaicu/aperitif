import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @param {{ userId: string }} args
 */
export async function createPasskeyOptions({ origin, pool }, { userId }) {
  const challenge = randomBytes(32);

  await pool.query(
    `
      INSERT INTO registration_challenges (
        challenge,
        user_id
      )
      VALUES ($1, $2)
    `,
    [challenge, userId],
  );

  const { rows: credentials } = await pool.query(
    `
      SELECT credential_id
      FROM passkey_credentials
      WHERE user_id = $1
    `,
    [userId],
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
    userDisplayName: userId,
    userID: Buffer.from(userId.replaceAll("-", ""), "hex"),
    userName: userId,
  });
}
