import { claim } from "./admission.claim.mjs";
import { get } from "./admission.get.mjs";
import { create } from "./admissions.create.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createAdmissionsDomain = (ctx) => ({
  claim: claim(ctx),
  createSelfStarted: create(ctx),
  get: get(ctx),
});

/**
 * @typedef {ReturnType<typeof createAdmissionsDomain>} AdmissionsDomain
 */
