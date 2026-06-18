import { assignOperator, revokeOperator } from "./operator.mjs";

/**
 * @param {{ db: import("pg").Pool }} resources
 */
export const createOperatorsService = ({ db }) => ({
  assignOperator: assignOperator({ db }),
  revokeOperator: revokeOperator({ db }),
});

/**
 * @typedef {ReturnType<typeof createOperatorsService>} OperatorsService
 */
