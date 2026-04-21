import { createPasskeysDomain } from "./passkeys/index.mjs";
import { createSessionsDomain } from "./sessions/index.mjs";

/**
 * @typedef {import("../platform/context.mjs").Context} Context
 */

/**
 * @typedef {ReturnType<typeof createDomains>} Domains
 */

/**
 * @param {Context} ctx
 */
export const createDomains = (ctx) => ({
  passkeys: createPasskeysDomain(ctx),
  sessions: createSessionsDomain(ctx),
});
