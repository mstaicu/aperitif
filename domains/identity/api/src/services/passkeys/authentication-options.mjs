import { generateAuthenticationOptions } from "@simplewebauthn/server";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 */
export async function createPasskeyAuthenticationOptions({ origin, pool }) {
  const options = await generateAuthenticationOptions({
    rpID: new URL(origin).hostname,
    userVerification: "required",
  });

  await pool.query(
    `
      INSERT INTO passkey_authentication_challenges (
        challenge
      )
      VALUES ($1)
    `,
    [options.challenge],
  );

  return options;
}
