// @ts-check

/**
 * @returns {import("express").RequestHandler}
 */
export var getHealthzHandler = () => (_, res) => res.sendStatus(200);

/**
 * @param {import("pg").Pool} pool
 * @returns {import("express").RequestHandler}
 */
export var getReadyzHandler = (pool) => async (_, res) => {
  try {
    await pool.query("SELECT 1");
    res.sendStatus(200);
  } catch {
    res.sendStatus(503);
  }
};
