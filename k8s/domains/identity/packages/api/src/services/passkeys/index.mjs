import { createLoginChallenge } from "./login.challenge.mjs";
import { login } from "./login.mjs";
import {
  createPasskeyChallenge,
  createRegisterChallenge,
} from "./register.challenge.mjs";
import { createPasskey, register } from "./register.mjs";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 */
export const createPasskeysService = (runtime) => ({
  createLoginChallenge: createLoginChallenge(runtime),
  createPasskey: createPasskey(runtime),
  createPasskeyChallenge: createPasskeyChallenge(runtime),
  createRegisterChallenge: createRegisterChallenge(runtime),
  login: login(runtime),
  register: register(runtime),
});

/**
 * @typedef {ReturnType<typeof createPasskeysService>} PasskeysService
 */
