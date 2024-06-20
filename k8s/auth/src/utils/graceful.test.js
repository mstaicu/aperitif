// @ts-check
import axios from "axios";
import express from "express";

import { equal } from "node:assert";
import { test } from "node:test";
import http from "node:http";

import { graceful, isClosing } from "./graceful.js";

test("server took no time to close server with no requests", async function () {
  /**
   * arrange
   */
  const server = getExpressServer();
  const close = graceful(server);
  await waitEvent(server, "listening");

  /**
   * act
   */
  const started = Date.now();
  await close();

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
    const server = getExpressServer();
    const close = graceful(server);
    await waitEvent(server, "listening");

    /**
     * act
     */
    const httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 5000,
    });
    const response = await axios("http://localhost:3030/", { httpAgent });

    equal(response.data, "ok");

    /**
     * wait for the keep-alive connection to expire
     */
    await new Promise((resolve) => setTimeout(resolve, 5000));

    /**
     * measure how long it took to close the server
     */
    const started = Date.now();
    await close();

    /**
     * assert
     */
    equal(isAround(Date.now() - started, 0), true);
  }
);

test("server took as long as the request to close, 3 seconds", async function () {
  /**
   * arrange
   */
  const server = getExpressServer();
  const close = graceful(server);
  await waitEvent(server, "listening");

  /**
   * act
   */
  const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 5000,
  });
  const request = axios("http://localhost:3030/slow-request", {
    httpAgent,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  const started = Date.now();
  /**
   * Calling 'close' in the middle of a slow request
   * 'Connection: close' would be set to all pending responses
   */
  await close();

  const respose = await request;
  equal(respose.data, "ok");

  /**
   * assert
   */
  equal(isAround(Date.now() - started, 3000), true);
});

test("server took as long as the isClosing(res) check to close", async function () {
  /**
   * arrange
   */
  const server = getExpressServer();
  const close = graceful(server);
  await waitEvent(server, "listening");

  /**
   * act
   */
  const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 5000,
  });
  const request = axios("http://localhost:3030/long-polling", {
    httpAgent,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  const started = Date.now();

  await close();

  const response = await request;
  equal(response.data, "ok");

  /**
   * assert
   */
  equal(isAround(Date.now() - started, 1000), true);
});

test("server took as the longest request to close, 3 seconds", async function () {
  /**
   * arrange
   */
  const server = getExpressServer();
  const close = graceful(server);
  await waitEvent(server, "listening");

  /**
   * act
   */
  const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 5000,
  });
  const response = await axios("http://localhost:3030/", {
    httpAgent,
  });
  equal(response.data, "ok");

  const request2 = axios("http://localhost:3030/slow-request", {
    httpAgent,
  });
  const request3 = axios("http://localhost:3030/long-polling", {
    httpAgent,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  const started = Date.now();
  await close();

  const response2 = await request2;
  equal(response2.data, "ok");

  const response3 = await request3;
  equal(response3.data, "ok");

  /**
   * assert
   */
  equal(isAround(Date.now() - started, 3000), true);
});

test("server took the configured 'timeoutForceEndSockets' to close", async function () {
  /**
   * arrange
   */
  const server = getExpressServer();
  const close = graceful(server, { timeoutForceEndSockets: 1000 });
  await waitEvent(server, "listening");

  /**
   * act
   */
  const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 5000,
  });
  const request = axios("http://localhost:3030/slow-request", {
    httpAgent,
  }).catch((error) => error);

  await new Promise((resolve) => setTimeout(resolve, 100));

  const started = Date.now();

  await close();

  const response = await request;
  equal(response.code, "ECONNRESET");

  /**
   * assert
   */
  equal(isAround(Date.now() - started, 1000), true);
});

function getExpressServer() {
  const app = express();

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

function waitEvent(emitter, eventName) {
  return new Promise((resolve) => emitter.once(eventName, resolve));
}

function isAround(real, expected, precision = 200) {
  const diff = Math.abs(real - expected);
  return diff <= precision;
}
