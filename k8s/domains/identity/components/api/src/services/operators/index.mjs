import { assignOperator, revokeOperator } from "./operator.mjs";

/**
 * @param {{ pool: import("pg").Pool }} resources
 */
export const createOperatorsService = ({ pool }) => ({
  assignOperator: assignOperator({ pool }),
  revokeOperator: revokeOperator({ pool }),
});

/**
 * @typedef {ReturnType<typeof createOperatorsService>} OperatorsService
 */
