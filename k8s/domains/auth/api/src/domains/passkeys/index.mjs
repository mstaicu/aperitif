import { createLoginChallenge } from "./login.challenge.mjs";
import { login } from "./login.mjs";
import { createRegisterChallenge } from "./register.challenge.mjs";
import { register } from "./register.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createPasskeysDomain = (ctx) => ({
  createLoginChallenge: createLoginChallenge(ctx),
  createRegisterChallenge: createRegisterChallenge(ctx),
  login: login(ctx),
  register: register(ctx),
});

/**
 * @typedef {ReturnType<typeof createPasskeysDomain>} PasskeysDomain
 */
