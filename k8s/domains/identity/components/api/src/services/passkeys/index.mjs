import { createLoginChallenge } from "./login.challenge.mjs";
import { login } from "./login.mjs";
import { createRegisterChallenge } from "./register.challenge.mjs";
import { register } from "./register.mjs";

/**
 * @param {{ db: import("pg").Pool, origin: string }} resources
 */
export const createPasskeysService = ({ db, origin }) => ({
  createLoginChallenge: createLoginChallenge({ db, origin }),
  createRegisterChallenge: createRegisterChallenge({ db, origin }),
  login: login({ db, origin }),
  register: register({ db, origin }),
});

/**
 * @typedef {ReturnType<typeof createPasskeysService>} PasskeysService
 */
