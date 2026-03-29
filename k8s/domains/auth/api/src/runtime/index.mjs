import { createPasskeysRuntime } from "./passkeys/index.mjs";
import { createSessionsRuntime } from "./sessions/index.mjs";

/**
 * @typedef {import("../context.mjs").Context} Context
 */

/**
 * @typedef {ReturnType<typeof createRuntime>} Runtime
 */

/**
 * @param {Context} ctx
 */
export const createRuntime = (ctx) => ({
  passkeys: createPasskeysRuntime(ctx),
  sessions: createSessionsRuntime(ctx),
});
