import { assignOperator, revokeOperator } from "./operator.mjs";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 */
export const createOperatorsService = (runtime) => ({
  assignOperator: assignOperator(runtime),
  revokeOperator: revokeOperator(runtime),
});

/**
 * @typedef {ReturnType<typeof createOperatorsService>} OperatorsService
 */
