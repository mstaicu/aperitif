import { assignOperator, revokeOperator } from "./operator.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createOperatorsService = (ctx) => ({
  assignOperator: assignOperator(ctx),
  revokeOperator: revokeOperator(ctx),
});

/**
 * @typedef {ReturnType<typeof createOperatorsService>} OperatorsService
 */
