// @ts-check
import express from "express";
import { equal } from "node:assert";
import http from "node:http";
import { test } from "node:test";

import { addGracefulShutdown, isClosing } from "./graceful-shutdown.mjs";

test("server took no time to close server with no requests", async function () {
  /**
   * arrange
   */
  var server = addGracefulShutdown(getExpressServer());
  await waitEvent(server, "listening");

  /**
   * act
   */
  var started = Date.now();
  await server.gracefulShutdown();

  /**
   * assert
   */
  equal(isAround(Date.now() - started, 0), true);
});

test(
  "server took no time to close after keep-alive timeout",
  { timeout: 6000 },
  async function () {
    /**
     * arrange
     */
    var server = addGracefulShutdown(getExpressServer());
    await waitEvent(server, "listening");

    /**
     * act
     */
    var response = await fetch("http://localhost:3030/", {
      keepalive: true,
    });

    equal(await response.text(), "ok");

    /**
     * wait for the keep-alive connection to expire
     */
    await new Promise((resolve) => setTimeout(resolve, 5000));

    /**
     * measure how long it took to close the server
     */
    var started = Date.now();
    await server.gracefulShutdown();

    /**
     * assert
     */
    equal(isAround(Date.now() - started, 0), true);
  },
);

test("server took as long as the request to close, 3 seconds", async function () {
  /**
   * arrange
   */
  var server = addGracefulShutdown(getExpressServer());
  await waitEvent(server, "listening");

  /**
   * act
   */
  var request = fetch("http://localhost:3030/slow-request", {
    keepalive: true,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  var started = Date.now();
  /**
   * Calling 'close' in the middle of a slow request
   * 'Connection: close' would be set to all pending responses
   */
  await server.gracefulShutdown();

  var respose = await request;
  equal(await respose.text(), "ok");

  /**
   * assert
   */
  equal(isAround(Date.now() - started, 3000), true);
});

test("server took as long as the 'isClosing(res)' check to close", async function () {
  /**
   * arrange
   */
  var server = addGracefulShutdown(getExpressServer());
  await waitEvent(server, "listening");

  /**
   * act
   */
  var request = fetch("http://localhost:3030/long-polling", {
    keepalive: true,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  var started = Date.now();

  await server.gracefulShutdown();

  var response = await request;
  equal(await response.text(), "ok");

  /**
   * assert
   */
  equal(isAround(Date.now() - started, 1000), true);
});

test("server took as the longest request to close, 3 seconds", async function () {
  /**
   * arrange
   */
  var server = addGracefulShutdown(getExpressServer());
  await waitEvent(server, "listening");

  /**
   * act
   */

  var request = await fetch("http://localhost:3030/", {
    keepalive: true,
  });

  equal(await request.text(), "ok");

  var request2 = fetch("http://localhost:3030/slow-request", {
    keepalive: true,
  });

  var request3 = fetch("http://localhost:3030/long-polling", {
    keepalive: true,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  var started = Date.now();
  await server.gracefulShutdown();

  var response2 = await request2;
  equal(await response2.text(), "ok");

  var response3 = await request3;
  equal(await response3.text(), "ok");

  /**
   * assert
   */
  equal(isAround(Date.now() - started, 3000), true);
});

test("server took the configured 'timeoutForceEndSockets' to close", async function () {
  /**
   * arrange
   */
  var server = addGracefulShutdown(getExpressServer(), {
    timeoutForceEndSockets: 1000,
  });
  await waitEvent(server, "listening");

  /**
   * act
   */

  var options = {
    hostname: "localhost",
    method: "GET",
    path: "/slow-request",
    port: 3030,
  };

  var request = new Promise((resolve, reject) => {
    var req = http.request(options);

    /**
     * @param {NodeJS.ErrnoException} error
     */
    var handler = (error) => {
      if (error.code === "ECONNRESET") {
        resolve("ECONNRESET");
      } else {
        reject(error);
      }
    };

    req.on("error", handler);

    req.end();
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  var started = Date.now();

  await server.gracefulShutdown();

  var response = await request;

  /**
   * assert
   */
  equal(response, "ECONNRESET");
  equal(isAround(Date.now() - started, 1000), true);
});

function getExpressServer() {
  var app = express();

  app.get("/", function (_, res) {
    res.send("ok");
  });

  app.get("/slow-request", async function (_, res) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    res.send("ok");
  });

  app.get("/long-polling", async function (_, res) {
    for (let i = 0; i < 15; i++) {
      if (isClosing(res)) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    res.send("ok");
  });

  return app.listen(3030);
}

/**
 *
 * @param {*} emitter
 * @param {*} eventName
 * @returns
 */
function waitEvent(emitter, eventName) {
  return new Promise((resolve) => emitter.once(eventName, resolve));
}

/**
 *
 * @param {*} real
 * @param {*} expected
 * @param {*} precision
 * @returns
 */
function isAround(real, expected, precision = 200) {
  var diff = Math.abs(real - expected);
  return diff <= precision;
}
