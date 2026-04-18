import { claim } from "./admission.claim.mjs";
import { create } from "./admissions.create.mjs";
import { get } from "./admission.get.mjs";

/**
 * @param {import("../../context.mjs").Context} ctx
 */
export const createAdmissionsRuntime = (ctx) => ({
  claim: claim(ctx),
  create: create(ctx),
  get: get(ctx),
});

/**
 * @typedef {ReturnType<typeof createAdmissionsRuntime>} AdmissionsRuntime
 */
