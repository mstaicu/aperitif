import { createAccount } from "./accounts.create.mjs";
import { listAccounts } from "./accounts.list.mjs";

/**
 * @param {{ db: import("pg").Pool }} resources
 */
export const createAccountsService = ({ db }) => ({
  createAccount: createAccount({ db }),
  listAccounts: listAccounts({ db }),
});

/**
 * @typedef {ReturnType<typeof createAccountsService>} AccountsService
 */
