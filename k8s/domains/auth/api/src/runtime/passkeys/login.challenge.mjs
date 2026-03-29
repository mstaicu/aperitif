import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

/**
 * @typedef {import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON} PublicKeyCredentialRequestOptionsJSON
 */

/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {() => Promise<PublicKeyCredentialRequestOptionsJSON>}
 */
export const createLoginChallenge = (ctx) => async () => {
  const challenge = randomBytes(32);

  await ctx.db.query(
    `
      INSERT INTO challenges (user_id, challenge)
      VALUES (NULL, $1)
    `,
    [challenge],
  );

  return generateAuthenticationOptions({
    challenge,
    rpID: new URL(ctx.conf.origin).hostname,
    userVerification: "required",
  });
};
