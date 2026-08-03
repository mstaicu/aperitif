import { DatabaseError } from "pg";

import { createError } from "../../platform/problem-details.mjs";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: { currentUserId: string }) => Promise<{
 *   accounts: {
 *     id: string,
 *     name: string,
 *     type: "personal" | "business",
 *   }[],
 * }>}
 */
export const listAccounts =
  ({ pool }) =>
  async ({ currentUserId }) => {
    let rows;

    try {
      ({ rows } = await pool.query(
        `
          SELECT a.id,
            a.name,
            a.type
          FROM account_members am
          JOIN accounts a ON a.id = am.account_id
          WHERE am.user_id = $1
          ORDER BY a.name, a.id
        `,
        [currentUserId],
      ));
    } catch (err) {
      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (Error.isError(err) &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw createError("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    }

    return {
      accounts: rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
      })),
    };
  };
