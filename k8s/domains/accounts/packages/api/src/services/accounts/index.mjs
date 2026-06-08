import { createAccount } from "./accounts.create.mjs";
import { listAccounts } from "./accounts.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createAccountsService = (ctx) => ({
  createAccount: createAccount(ctx),
  listAccounts: listAccounts(ctx),
});

/**
 * @typedef {ReturnType<typeof createAccountsService>} AccountsService
 */
