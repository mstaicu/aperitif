import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes, randomUUID } from "node:crypto";

/**
 * @typedef {import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON} PublicKeyCredentialCreationOptionsJSON
 */

/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {() => Promise<PublicKeyCredentialCreationOptionsJSON>}
 */
export const createRegisterChallenge = (ctx) => async () => {
  const userId = randomUUID();

  const webauthnUserHandle = Buffer.from(userId.replace(/-/g, ""), "hex");
  const challenge = randomBytes(32);

  await ctx.data.db.query(
    `
      INSERT INTO challenges (user_id, challenge)
      VALUES ($1, $2)
    `,
    [userId, challenge],
  );

  const { hostname } = new URL(ctx.app.origin);

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
