import type { Socket } from 'net';

import { app } from './app';

const server = app.listen(process.env.PORT!, () => {
  console.log(`Running on port ${process.env.PORT!}`);
});

const sockets = new Set<Socket>();

server.on('connection', socket => {
  sockets.add(socket);
  server.once('close', () => sockets.delete(socket));
});

/**
 * need this in docker container to properly exit since node doesn't handle SIGINT/SIGTERM
 * this also won't work on using npm start since:
 *
 * https://github.com/npm/npm/issues/4603
 * https://github.com/npm/npm/pull/10868
 * https://github.com/RisingStack/kubernetes-graceful-shutdown-example/blob/master/src/index.js
 */

// Quit on CTRL - C when running Docker in Terminal
process.on('SIGINT', () => {
  console.info('Received SIGINT, gracefully shutting down');
  shutdown();
});

// Quit on docker stop command
process.on('SIGTERM', () => {
  console.info('Received SIGTERM, gracefully shutting down');
  shutdown();
});

const shutdown = () => {
  /**
   * The server is finally closed when all connections are ended and the server emits a 'close' event.
   * waitForSocketsToClose will give existing connections 10 seconds to terminate before destroying the sockets
   */
  waitForSocketsToClose(10);

  /**
   * https://nodejs.org/api/net.html#net_server_close_callback
   *
   * server.close([callback])
   *
   * callback <Function> Called when the server is closed.
   * Returns: <net.Server>
   *
   * Stops the server from accepting new connections and keeps existing connections
   * This function is asynchronous, the server is finally closed when all connections are ended and the server emits a 'close' event.
   * The optional callback will be called once the 'close' event occurs. Unlike that event, it will be called with an Error as its only argument if the server was not open when it was closed.
   */

  server.close(err => {
    if (err) {
      console.error(err);
      process.exitCode = 1;
    }

    process.exitCode = 0;
    process.exit();
  });
};

const waitForSocketsToClose = (counter: number) => {
  if (counter > 0) {
    console.log(
      `Waiting ${counter} more ${
        counter !== 1 ? 'seconds' : 'second'
      } for all connections to close...`,
    );

    return setTimeout(waitForSocketsToClose, 1000, counter - 1);
  }

  console.log('Forcing all connections to close now');

  for (const socket of sockets) {
    socket.destroy();
    sockets.delete(socket);
  }
};

export { server };
