import { assignOperatorRole, revokeOperatorRole } from "./operator-role.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createOperatorsService = (ctx) => ({
  assignOperatorRole: assignOperatorRole(ctx),
  revokeOperatorRole: revokeOperatorRole(ctx),
});

/**
 * @typedef {ReturnType<typeof createOperatorsService>} OperatorsService
 */
