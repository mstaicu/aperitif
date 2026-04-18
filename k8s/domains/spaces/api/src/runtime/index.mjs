import { createAdmissionsRuntime } from "./admissions/index.mjs";
import { createSpacesRuntime } from "./spaces/index.mjs";

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
  admissions: createAdmissionsRuntime(ctx),
  spaces: createSpacesRuntime(ctx),
});
