var withRetry =
  (maxRetries = 10, initialRetryInterval = 1000) =>
  (fn) => {
    var retries = 0;

    return new Promise((resolve, reject) => {
      const retry = async () => {
        try {
          resolve(await fn());
        } catch (err) {
          if (retries < maxRetries) {
            retries += 1;
            setTimeout(retry, initialRetryInterval * Math.pow(2, retries));
          } else {
            reject(err);
          }
        }
      };

      retry();
    });
  };

export { withRetry };
