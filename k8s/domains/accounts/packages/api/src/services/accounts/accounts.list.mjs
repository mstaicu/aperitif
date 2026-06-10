import { DatabaseError } from "pg";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 * @returns {(args: { currentUserId: string }) => Promise<{
 *   accounts: {
 *     id: string,
 *     name: string,
 *   }[],
 * }>}
 */
export const listAccounts =
  (runtime) =>
  async ({ currentUserId }) => {
    let rows;

    try {
      ({ rows } = await runtime.persistence.db.query(
        `
          SELECT a.id, a.name
          FROM account_members am
          JOIN accounts a ON a.id = am.account_id
          WHERE am.user_id = $1
          ORDER BY a.name, a.id
        `,
        [currentUserId],
      ));
    } catch (err) {
      if (err instanceof DatabaseError) {
        if (
          err.code?.startsWith("08") ||
          err.code === "53300" ||
          err.code === "57P01" ||
          err.code === "57P02" ||
          err.code === "57P03" ||
          err.code === "57014"
        ) {
          throw new Error("DATABASE_UNAVAILABLE", { cause: err });
        }
      }

      throw err;
    }

    return {
      accounts: rows.map((row) => ({
        id: row.id,
        name: row.name,
      })),
    };
  };
