import { deleteOverride } from "./override.delete.mjs";
import { setOverride } from "./override.set.mjs";
import { set } from "./plan.set.mjs";

/**
 * @param {{ pool: import("pg").Pool }} resources
 */
export const getPlansService = ({ pool }) => ({
  deleteOverride: deleteOverride({ pool }),
  set: set({ pool }),
  setOverride: setOverride({ pool }),
});

/**
 * @typedef {ReturnType<typeof getPlansService>} PlansService
 */
