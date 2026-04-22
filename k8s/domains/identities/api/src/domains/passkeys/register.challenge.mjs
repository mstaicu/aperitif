import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes, randomUUID } from "node:crypto";

import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @typedef {import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON} PublicKeyCredentialCreationOptionsJSON
 */

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {() => Promise<PublicKeyCredentialCreationOptionsJSON>}
 */
export const createRegisterChallenge = (ctx) => async () => {
  try {
    const userId = randomUUID();

    const webauthnUserHandle = Buffer.from(userId.replace(/-/g, ""), "hex");
    const challenge = randomBytes(32);

    await ctx.persistence.db.query(
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
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      throw new Error("DATABASE_UNAVAILABLE", { cause: err });
    }

    throw err;
  }
};
