import { set } from "./plan.set.mjs";

/**
 * @param {{ pool: import("pg").Pool }} resources
 */
export const getPlansService = ({ pool }) => ({
  set: set({ pool }),
});

/**
 * @typedef {ReturnType<typeof getPlansService>} PlansService
 */
