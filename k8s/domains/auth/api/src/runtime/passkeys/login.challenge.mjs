import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {Promise<import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON>}
 */
export const createLoginChallenge = async (ctx) => {
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
