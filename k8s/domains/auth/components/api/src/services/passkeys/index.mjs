import { createLoginChallenge } from "./login.challenge.mjs";
import { login } from "./login.mjs";
import { createRegisterChallenge } from "./register.challenge.mjs";
import { register } from "./register.mjs";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 */
export const createPasskeysService = ({ origin, pool }) => ({
  createLoginChallenge: createLoginChallenge({ origin, pool }),
  createRegisterChallenge: createRegisterChallenge({ origin, pool }),
  login: login({ origin, pool }),
  register: register({ origin, pool }),
});

/**
 * @typedef {ReturnType<typeof createPasskeysService>} PasskeysService
 */
