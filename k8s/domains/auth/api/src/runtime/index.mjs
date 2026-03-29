import { createPasskeysRuntime } from "./passkeys/index.mjs";
import { createSessionsRuntime } from "./sessions/index.mjs";

/**
 * @typedef {import("../context.mjs").Context} Context
 */

/**
 * @typedef {ReturnType<typeof createPasskeysRuntime>} PasskeysRuntime
 * @typedef {ReturnType<typeof createSessionsRuntime>} SessionsRuntime
 * @typedef {{ passkeys: PasskeysRuntime, sessions: SessionsRuntime }} Runtime
 */

/**
 * @param {Context} ctx
 * @returns {Runtime}
 */
export const createRuntime = (ctx) => ({
  passkeys: createPasskeysRuntime(ctx),
  sessions: createSessionsRuntime(ctx),
});
