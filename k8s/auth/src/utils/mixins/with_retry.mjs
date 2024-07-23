var withRetry =
  (maxRetries = 10, initialRetryInterval = 1000) =>
  (fn) => {
    var retries = 0;

    return new Promise((resolve, reject) => {
      const connect = async () => {
        try {
          resolve(await fn());
        } catch (err) {
          if (retries < maxRetries) {
            retries += 1;
            setTimeout(connect, initialRetryInterval * Math.pow(2, retries));
          } else {
            reject(err);
          }
        }
      };

      connect();
    });
  };

export { withRetry };
