import { createAccount } from "./accounts.create.mjs";
import { listAccounts } from "./accounts.list.mjs";

/**
 * @param {{ pool: import("pg").Pool }} resources
 */
export const createAccountsService = ({ pool }) => ({
  createAccount: createAccount({ pool }),
  listAccounts: listAccounts({ pool }),
});

/**
 * @typedef {ReturnType<typeof createAccountsService>} AccountsService
 */
