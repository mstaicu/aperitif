// @ts-check
var shutdownInitiated = false;

/**
 * @param {import('node:http').Server} server
 * @param {import('mongoose').Connection[]} mongooseConnections
 */
export var handleShutdown = async (server, mongooseConnections) => {
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

    console.log("closing database connections...");

    for (let connection of mongooseConnections) {
      if (connection.readyState === 1) {
        await connection.close();
      }
    }

    console.log("shutdown complete");

    process.exit(0);
  } catch {
    process.exit(1);
  }
};
