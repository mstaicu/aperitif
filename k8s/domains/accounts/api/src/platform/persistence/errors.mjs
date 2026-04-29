/**
 * @param {unknown} err
 * @returns {boolean}
 */
export const isDatabaseUnavailable = (err) => {
  /** @type {any} */
  const error = err;

  const code = error?.code;
  const message = /** @type {Error} */ (err).message;

  return (
    (typeof code === "string" &&
      (code.startsWith("08") || code === "53300" || code === "57014")) ||
    message === "Query read timeout" ||
    message === "timeout exceeded when trying to connect" ||
    message === "Connection terminated unexpectedly"
  );
};
