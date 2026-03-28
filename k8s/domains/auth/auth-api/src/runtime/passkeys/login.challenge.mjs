import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

/**
 * @param {import('../../fastify.js').Ctx} ctx
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

  const { hostname } = new URL(ctx.conf.origin);

  return generateAuthenticationOptions({
    challenge,
    rpID: hostname,
    userVerification: "required",
  });
};
