import { setPlan } from "./plan.set.mjs";

/**
 * @param {{ pool: import("pg").Pool }} resources
 */
export const createPlansService = ({ pool }) => ({
  setPlan: setPlan({ pool }),
});

/**
 * @typedef {ReturnType<typeof createPlansService>} PlansService
 */
