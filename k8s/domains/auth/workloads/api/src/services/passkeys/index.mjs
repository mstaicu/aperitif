import { authenticate } from "./authentication.mjs";
import { createAuthenticationOptions } from "./authentication.options.mjs";
import { register } from "./registration.mjs";
import { createRegistrationOptions } from "./registration.options.mjs";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 */
export const createPasskeysService = ({ origin, pool }) => ({
  authenticate: authenticate({ origin, pool }),
  createAuthenticationOptions: createAuthenticationOptions({ origin, pool }),
  createRegistrationOptions: createRegistrationOptions({ origin, pool }),
  register: register({ origin, pool }),
});

/**
 * @typedef {ReturnType<typeof createPasskeysService>} PasskeysService
 */
