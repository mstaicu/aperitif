// @ts-check
import { authDbConnection } from "../services/index.mjs";

var shutdownInitiated = false;

var withShutdown =
  ({ dbConnections = [authDbConnection] } = {}) =>
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

      console.log("shutdown complete");

      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  };

var handleShutdown = withShutdown();

export { handleShutdown };
