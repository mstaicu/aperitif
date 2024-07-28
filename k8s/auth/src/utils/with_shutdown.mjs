import { authDbConnection, redis } from "../services/index.mjs";

var shutdownInitiated = false;

var withShutdown =
  ({ dbConnections = [authDbConnection], redisClients = [redis] } = {}) =>
  async (fn) => {
    if (shutdownInitiated) {
      return;
    }

    shutdownInitiated = true;

    console.log("shutting down");

    try {
      /**
       * TODO: If the server cannot shut down gracefuly,
       * make sure the pending connections are closed regardless
       */
      await fn();

      for (let dbConnection of dbConnections) {
        if (dbConnection.readyState === 1) {
          await dbConnection.close();
        }
      }

      try {
        for (let redisClient of redisClients) {
          if (await redisClient.ping()) {
            await redisClient.quit();
          }
        }
      } catch (err) {}

      console.log("shutdown complete");

      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  };

var handleShutdown = withShutdown();

export { handleShutdown };
