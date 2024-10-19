// @ts-check
var shutdownInitiated = false;

/**
 * @param {import('node:http').Server} server
 * @param {import('mongoose').Connection[]} dbConnections
 */
var handleShutdown = async (server, dbConnections = []) => {
  if (shutdownInitiated) {
    return;
  }

  shutdownInitiated = true;

  console.log("initiating graceful shutdown");

  try {
    if (server && server.gracefulShutdown) {
      console.log("closing server connections...");
      await server.gracefulShutdown();
    }

    for (let connection of dbConnections) {
      if (connection.readyState === 1) {
        console.log("closing database connection...");
        await connection.close();
      }
    }

    console.log("shutdown complete");

    process.exit(0);
  } catch {
    process.exit(1);
  }
};

export { handleShutdown };
