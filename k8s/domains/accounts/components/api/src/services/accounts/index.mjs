import { createAccount } from "./accounts.create.mjs";
import { listAccounts } from "./accounts.list.mjs";
import { createMember } from "./members.create.mjs";
import { deleteMember } from "./members.delete.mjs";
import { listMembers } from "./members.list.mjs";
import { updateMember } from "./members.update.mjs";

/**
 * @param {{ pool: import("pg").Pool }} resources
 */
export const createAccountsService = ({ pool }) => ({
  createAccount: createAccount({ pool }),
  createMember: createMember({ pool }),
  deleteMember: deleteMember({ pool }),
  listAccounts: listAccounts({ pool }),
  listMembers: listMembers({ pool }),
  updateMember: updateMember({ pool }),
});

/**
 * @typedef {ReturnType<typeof createAccountsService>} AccountsService
 */
