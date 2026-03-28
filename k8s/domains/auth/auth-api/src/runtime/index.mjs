import { createPasskeysRuntime } from "./passkeys/index.mjs";
import { createSessionsRuntime } from "./sessions/index.mjs";

/**
 * @param {import('../fastify.js').Ctx} ctx
 * @returns {import('../fastify.js').Runtime}
 */
export const createRuntime = (ctx) => ({
  passkeys: createPasskeysRuntime(ctx),
  sessions: createSessionsRuntime(ctx),
});
