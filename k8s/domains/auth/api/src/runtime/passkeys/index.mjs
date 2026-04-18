import { createLoginChallenge } from "./login.challenge.mjs";
import { login } from "./login.mjs";
import { createRegisterChallenge } from "./register.challenge.mjs";
import { register } from "./register.mjs";

/**
 * @param {import("../../context.mjs").Context} ctx
 */
export const createPasskeysRuntime = (ctx) => ({
  createLoginChallenge: createLoginChallenge(ctx),
  createRegisterChallenge: createRegisterChallenge(ctx),
  login: login(ctx),
  register: register(ctx),
});

/**
 * @typedef {ReturnType<typeof createPasskeysRuntime>} PasskeysRuntime
 */
