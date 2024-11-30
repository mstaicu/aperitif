var shutdownInitiated = false;

/**
 * @param {import('node:http').Server} server
 * @param {import('mongoose').Connection} connection
 */
export var handleShutdown = async (server, connection) => {
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

    console.log("closing database connection...");

    if (connection.readyState === 1) {
      await connection.close();
    }

    console.log("shutdown complete");

    process.exit(0);
  } catch {
    process.exit(1);
  }
};
