import { createAccount } from "./accounts.create.mjs";
import { listAccounts } from "./accounts.list.mjs";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 */
export const createAccountsService = (runtime) => ({
  createAccount: createAccount(runtime),
  listAccounts: listAccounts(runtime),
});

/**
 * @typedef {ReturnType<typeof createAccountsService>} AccountsService
 */
