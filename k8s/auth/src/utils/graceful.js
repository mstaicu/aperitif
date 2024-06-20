// @ts-check
import { IncomingMessage, Server, ServerResponse } from "node:http";
import { Socket } from "node:net";

/**
 * https://www.dashlane.com/blog/implementing-nodejs-http-graceful-shutdown
 * https://github.com/LuKks/graceful-http/tree/master
 */

/**
 * @typedef {Object} options
 * @property {number} [timeoutEndIdleSockets] - Duration in ms to wait to gently close
 * @property {number} [timeoutForceEndSockets] - Duration in ms to wait to force close
 */

/**
 * @typedef {Object} serverStatus
 * @property {WeakMap<Socket, boolean>} hasRepliedClosedConnectionForSocket
 * @property {boolean} closing
 *
 */

/**
 * @typedef {WeakMap<Server, serverStatus>} servers
 */

/**
 * Helper function to allow better handling of keep-alive connections for
 * graceful termination of a server.
 *
 * Calling `server.close()` will stop the server from accepting new connections,
 * but existing keep-alive aren't closed nor handled in any special way by default.
 *
 * https://github.com/nodejs/node/issues/2642 shows that
 * this can keep a server for being shutdown cleanly after serving ongoing requests.
 *
 * This function will keep track of all opened connections and ongoing requests.
 *
 * The main idea is trying to serve all ongoing requests before shutting down the
 * server while trying to minimize the "socket hangup" or "connection reset"
 * errors on clients.
 *
 * Once the server starts being terminated, the server will reply with
 * 'Connection: close' headers to signal clients not to send requests on existing
 * connections because they will be closed. This is done to minimize the chance
 * of closing a connection while there is an in-flight request to the server.
 *
 * All connections for which a 'Connection: close' response has been sent, will be
 * terminated after handling the last request.
 *
 * After a timeout, all idle connections with no ongoing requests will be closed,
 * even if they haven't received the Connection: close header.
 *
 * After a bigger timeout, if some connections are still keeping the server
 * open, all connections will be forced closed and ongoing requests will not
 * send a response.
 */

/**
 *
 * This implementation only works if the clients respect the Connection: close header.
 * Most client implementation will do so, but if they don't there is not much we can do about it.
 *
 * This solution is only for HTTP servers, HTTPS might behave slightly differently.
 * This means that you should only use this solution in a configuration where your clients
 * are being served through HTTPS at some other point in the network.
 * For example, in our case the servers are behind a load balancer that handles HTTPS connections
 * with clients and the servers cannot be directly accessed from the outside the internal network.
 *
 * This solution only applies for the HTTP 1 protocol, which is used by NodeJS's HTTP server.
 * The HTTP2 protocol (used only by NodeJS http2 module) does not allow
 * Connection: keep-alive or Connection: close headers.
 * In HTTP2, persistent connections are the default and closing connections with clients is done
 * differently.
 */

/**
 * If the client does not provide a Connection: keep-alive header in the request
 * or explicitly indicate that it wants to keep the connection open,
 * the server typically closes the connection after serving the request.
 * This behavior is often referred to as "non-persistent" or "non-keep-alive" connections.
 *
 * Non-Persistent Connections:
 *
 * In HTTP/1.0, connections are typically non-persistent by default,
 * meaning that the server closes the connection after sending the response.
 *
 * After the server sends the response to the client, it closes the underlying TCP connection,
 * releasing server resources and allowing the client to know that the response is complete.
 *
 * The server may emit a 'close' event on the socket object representing the connection
 * to indicate that the connection has been closed.
 *
 *
 * Keep-Alive Connections:
 *
 * In contrast, in HTTP/1.1 and later versions, connections are often kept alive by default
 * unless the client explicitly requests otherwise or the server decides to close the connection.
 *
 * When a client includes a Connection: keep-alive header in the request,
 * it indicates to the server that it wants to keep the connection open for potential reuse.
 *
 * The server may honor this request and keep the connection open for a certain period,
 * allowing the client to send additional requests over the same connection
 * without incurring the overhead of establishing a new TCP connection each time.
 * In this case, the server may not emit a 'close' event immediately after serving the request,
 * as the connection remains open for potential reuse.
 */

/**
 * This utility can be used with clustering, where each child process is the worker instance
 * that represents a server handling the request
 */

/**
 * @type {servers}
 */
var servers = new WeakMap();

/**
 * Close the server
 *
 * @param {Server} server
 * @param {options} [options]
 */
function graceful(server, options = {}) {
  /**
   * In cases a client is sending no more requests, we won't have the opportunity to send
   * 'Connection: close' back
   *
   * In these cases we should just end the connection as it has become idle.
   * Note that this could be achieved internally with server.keepAliveTimeout but
   * the normal runtime value might be different for what we'd like here
   */
  var timeoutEndIdleSockets = options.timeoutEndIdleSockets || 15000;

  /**
   * If the server needs to be stopped and it seems to be having trouble keeping up
   * with pending requests we should just force the closing of the connections
   */
  var timeoutForceEndSockets = options.timeoutForceEndSockets || 30000;

  /**
   * We need to keep track of requests per connection so that we can detect when we have responded
   * to a request in a 'keep-alive' connection. This is the only way in node that we can close a
   * keep-alive connection after handling requests.
   */

  /**
   * @type {Map<Socket, number>}
   */
  var requestCountPerSocket = new Map();

  /**
   * Responses holds the responses for which we haven't send a 'Connection: close' header
   */

  /**
   * @type {Map<ServerResponse, boolean>}
   */
  var responses = new Map();

  servers.set(server, {
    /*
     * To minimize the chances of closing a connection while there is a request in-flight from the client
     * we respond with a 'Connection: close' header once the server starts being terminated. We'll only
     * immediately close connections where we have responded this header. For others, we'll only
     * close them if they're still open after "timeoutEndIdleSockets"
     *
     * This won't help against clients that don't respect the Connection: close header
     * */
    hasRepliedClosedConnectionForSocket: new WeakMap(),
    closing: false,
  });

  /**
   * When a new client connects to the server, a 'connection' event is emitted,
   * providing a socket object representing the communication channel with that client.
   */
  server.prependListener("connection", trackConnections);
  /**
   * When a client sends an HTTP request (e.g., by visiting a webpage),
   * the server receives the request and emits a 'request' event,
   * allowing you to handle the request and send a response.
   */
  server.prependListener("request", trackRequests);

  /**
   * @param {Socket} socket
   */
  function trackConnections(socket) {
    requestCountPerSocket.set(socket, 0);
    socket.once("close", () => {
      requestCountPerSocket.delete(socket);
    });
  }

  /**
   * @param {IncomingMessage} request
   * @param {ServerResponse} response
   */
  function trackRequests(request, response) {
    var socket = request.socket;
    // @ts-ignore
    var server = servers.get(socket.server);

    requestCountPerSocket.set(
      socket,
      (requestCountPerSocket.get(socket) || 0) + 1
    );
    responses.set(response, true);

    /**
     * If we keep track of every request en each connection, we can add this header to
     * the last request being handled and close the connection once
     * the response has reached the client (or at least left the server).
     * If the header hasn't been sent for a specific connection
     * we'll keep it open to wait for a new request on it and send back the header.
     */

    /**
     * This 'if' statement block is for requests that have arrived after we initiated
     * the shutdown
     */
    if (server?.closing && !response.headersSent) {
      response.setHeader("connection", "close");
      /**
       * Mark the fact that we replied on this socket's ( connection ) HTTP request
       * that we will close this socket ( connection )
       */
      server.hasRepliedClosedConnectionForSocket.set(socket, true);
      responses.delete(response);
    }

    /**
     * When you write data to the response object and call response.end(),
     * the response is considered finished, triggering a 'finish' event.
     *
     * After the response has been sent from the server, check if we can close the socket
     */
    response.on("finish", () => {
      // @ts-ignore
      var serverStatus = servers.get(socket.server);

      var socketPendingRequests = (requestCountPerSocket.get(socket) || 0) - 1;
      var hasSuggestedClosingConnection =
        serverStatus?.hasRepliedClosedConnectionForSocket.get(socket);

      requestCountPerSocket.set(socket, socketPendingRequests);

      if (
        server?.closing &&
        socketPendingRequests === 0 &&
        hasSuggestedClosingConnection
      ) {
        socket.end();
      }
    });

    response.once("close", () => responses.delete(response));
  }

  /**
   * @returns {Promise<void>}
   */
  function close() {
    return new Promise((resolve, reject) => {
      var currentServerStatus = servers.get(server);

      // @ts-ignore
      servers.set(server, {
        ...currentServerStatus,
        closing: true,
      });

      /**
       * Loop over all the outstanding responses at the time of shutting down
       * and notify clients, by setting the Connection header, that we are shutting down
       *
       * After this loop, the response.on("finish") callback will take over
       */
      for (const [response] of responses.entries()) {
        if (!response.headersSent) {
          response.setHeader("connection", "close");
          currentServerStatus?.hasRepliedClosedConnectionForSocket.set(
            response.req.socket,
            true
          );
          responses.delete(response);
        }
      }

      var timeoutEndIdleSocketsId;

      if (timeoutEndIdleSockets < timeoutForceEndSockets) {
        timeoutEndIdleSocketsId = setTimeout(() => {
          for (var [socket, requestCount] of requestCountPerSocket.entries()) {
            if (requestCount === 0) {
              socket.end();
            }
          }
        }, timeoutEndIdleSockets);
      }

      var timeoutForceEndSocketsId = setTimeout(() => {
        for (var [socket] of requestCountPerSocket.entries()) {
          socket.end();
        }
      }, timeoutForceEndSockets);

      /**
       * The callback passed to server.close won't be called
       * as long as there are open connections
       *
       * So here we're "implicitly" also waiting for the callbacks
       * that will close idle connections or force close all connections
       * after a delay
       */
      server.close(function (error) {
        clearTimeout(timeoutEndIdleSocketsId);
        clearTimeout(timeoutForceEndSocketsId);

        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  return close;
}

/**
 *
 * Function to check if the the server is closing
 *
 * @param {Socket | IncomingMessage | ServerResponse} obj
 * @returns {boolean}
 */
function isClosing(obj) {
  var objType = obj.constructor.name;

  var server;

  if (objType === "Socket") {
    var socket = obj;

    // @ts-ignore
    server = socket.server;
  } else if (objType === "IncomingMessage" || objType === "ServerResponse") {
    var requestOrResponse = obj;

    // @ts-ignore
    server = requestOrResponse.socket.server;
  } else {
    throw new Error(
      objType +
        " is not supported. Should be one of: Socket, IncomingMessage or ServerResponse"
    );
  }

  var serverStatus = servers.get(server);

  // @ts-ignore
  return serverStatus.closing;
}

export { graceful, isClosing };
