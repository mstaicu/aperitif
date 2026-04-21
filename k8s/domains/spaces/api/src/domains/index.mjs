import { createAdmissionsDomain } from "./admissions/index.mjs";
import { createSpacesDomain } from "./spaces/index.mjs";

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
  admissions: createAdmissionsDomain(ctx),
  spaces: createSpacesDomain(ctx),
});
