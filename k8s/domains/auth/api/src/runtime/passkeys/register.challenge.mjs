import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes, randomUUID } from "node:crypto";

/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>}
 */
export const createRegisterChallenge = async (ctx) => {
  const userId = randomUUID();

  const webauthnUserHandle = Buffer.from(userId.replace(/-/g, ""), "hex");
  const challenge = randomBytes(32);

  await ctx.db.query(
    `
      INSERT INTO challenges (user_id, challenge)
      VALUES ($1, $2)
    `,
    [userId, challenge],
  );

  const { hostname } = new URL(ctx.conf.origin);

  return generateRegistrationOptions({
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    challenge,
    rpID: hostname,
    rpName: hostname,
    timeout: 60000,
    userID: webauthnUserHandle,
    userName: "",
  });
};
