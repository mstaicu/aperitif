import { setTimeout } from "node:timers";

/**
 * Utility function to retry a promise-returning function with exponential backoff and jitter.
 *
 * @param {Object} options - Options for the retry mechanism.
 * @param {number} [options.maxAttempts=3] - The maximum number of retry attempts.
 * @param {number} [options.initialRetryInterval=1000] - The initial retry interval in milliseconds.
 * @param {Function} [options.shouldRetry] - Function to determine if an error should trigger a retry.
 * @param {Function} [options.onAttempt] - Function called on each retry with the number of retries and the error.
 * @returns {Function} A function that takes a promise-returning function and returns a promise.
 */
var withRetry =
  ({
    maxAttempts = 3,
    initialRetryInterval = 1000,
    shouldRetry = () => true,
    onAttempt = () => {},
  } = {}) =>
  /**
   * @param {Function} fn - The promise-returning function to retry.
   * @returns {Promise<any>} A promise that resolves to the result of the function or rejects with an error.
   */
  (fn) => {
    var attempt = 0;

    return new Promise((resolve, reject) => {
      var retry = async () => {
        try {
          resolve(await fn());
        } catch (err) {
          if (attempt < maxAttempts && shouldRetry(err)) {
            attempt += 1;

            onAttempt(attempt, err);

            var jitter = Math.random() * initialRetryInterval;
            var delay = initialRetryInterval * Math.pow(2, attempt) + jitter;

            setTimeout(retry, delay);
          } else {
            reject(err);
          }
        }
      };

      retry();
    });
  };

export { withRetry };
