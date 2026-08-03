/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: { userId: string }) => Promise<{ user_id: string }>}
 */
export const assignOperator =
  ({ pool }) =>
  async ({ userId }) => {
    const {
      rows: [user],
    } = await pool.query(
      `
        SELECT 1
        FROM users
        WHERE id = $1
      `,
      [userId],
    );

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    await pool.query(
      `
        INSERT INTO operators (user_id)
        VALUES ($1)
        ON CONFLICT DO NOTHING
      `,
      [userId],
    );

    console.log(
      JSON.stringify({
        event: "operator_assigned",
        level: "info",
        user_id: userId,
      }),
    );

    return {
      user_id: userId,
    };
  };

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: { userId: string }) => Promise<{ user_id: string }>}
 */
export const revokeOperator =
  ({ pool }) =>
  async ({ userId }) => {
    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const { rows: operators } = await client.query(
        `
          SELECT user_id
          FROM operators
          FOR UPDATE
        `,
      );

      const removesLastOperator =
        operators.length <= 1 &&
        operators.some((operator) => operator.user_id === userId);

      if (removesLastOperator) {
        throw new Error("FORBIDDEN");
      }

      await client.query(
        `
          DELETE FROM operators
          WHERE user_id = $1
        `,
        [userId],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          event: "operator_revoked",
          level: "info",
          user_id: userId,
        }),
      );

      return {
        user_id: userId,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client?.release();
    }
  };
