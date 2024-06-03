// @ts-check
import axios from "axios";
import express from "express";
import http from "node:http";
import { test, expect } from "vitest";

import { graceful, check } from "./graceful";

test("server took the default 5 seconds of keep-alive time to close with no requests", async function () {
  const server = createExpressApp();
  const close = graceful(server);
  await waitEvent(server, "listening");

  const started = Date.now();
  await close();

  expect(isAround(Date.now() - started, 0)).toBe(true);
});

test(
  "server took no time to close after keep-alive timeout",
  { timeout: 6000 },
  async function (t) {
    const server = createExpressApp();
    const close = graceful(server);
    await waitEvent(server, "listening");

    const request = requester();

    const response = await request("/");
    expect(response.data).toBe("ok");

    // let keep-alive to expire
    await sleep(5000);

    const started = Date.now();
    await close();

    expect(isAround(Date.now() - started, 0)).toBe(true);
  }
);

test("server took as long as the request (3s) to close", async function () {
  const server = createExpressApp();
  const close = graceful(server);
  await waitEvent(server, "listening");

  const request = requester();
  const r1 = request("/slow-request");
  await sleep(100);

  const started = Date.now();
  /**
   * Calling 'close' in the middle of a slow request
   *
   * "Connection: close" would be set to all pending responses
   */
  await close();

  const response1 = await r1;
  expect(response1.data).toBe("ok");

  expect(isAround(Date.now() - started, 3000)).toBe(true);
});

test("close() in the middle of a long-polling request", async function () {
  const server = createExpressApp();
  const close = graceful(server);
  await waitEvent(server, "listening");

  const request = requester();
  const r1 = request("/long-polling");
  await sleep(100);

  const started = Date.now();
  await close();

  const response = await r1;
  expect(response.data).toBe("ok");

  expect(isAround(Date.now() - started, 1000)).toBe(true);
});

test("server took as the longest request (3s) to close with multiple concurrent requests", async function () {
  const server = createExpressApp();
  const close = graceful(server);
  await waitEvent(server, "listening");

  const request = requester();

  const response1 = await request("/");
  expect(response1.data).toBe("ok");

  const r2 = request("/slow-request");
  const r3 = request("/long-polling");

  await sleep(100);

  const started = Date.now();
  await close();

  const response2 = await r2;
  expect(response2.data).toBe("ok");

  const response3 = await r3;
  expect(response3.data).toBe("ok");

  expect(isAround(Date.now() - started, 3000)).toBe(true);
});

test("timeoutForceEndSockets with a pending request", async function () {
  const server = createExpressApp();
  const close = graceful(server, { timeoutForceEndSockets: 1000 });
  await waitEvent(server, "listening");

  const request = requester();

  const r1 = request("/slow-request").catch((error) => error);
  await sleep(100);

  const started = Date.now();
  await close();

  const response1 = await r1;
  expect(response1.code).toBe("ECONNRESET");

  // Server took the configured timeoutForceEndSockets to close
  expect(isAround(Date.now() - started, 1000)).toBe(true);
});

function createExpressApp() {
  const app = express();

  app.get("/", function (_, res) {
    res.send("ok");
  });

  app.get("/slow-request", async function (_, res) {
    await sleep(3000);
    res.send("ok");
  });

  app.get("/long-polling", async function (_, res) {
    for (let i = 0; i < 15; i++) {
      if (check(res)) {
        break;
      }

      await sleep(1000);
    }

    res.send("ok");
  });

  return app.listen(3030);
}

function requester() {
  const httpAgent = new http.Agent({
    keepAlive: true,
  });

  /**
   * @param {string} url
   */
  return function (url, opts = {}) {
    return axios.get("http://localhost:3030" + url, {
      httpAgent: opts.httpAgent || httpAgent,
    });
  };
}

function waitEvent(emitter, eventName) {
  return new Promise((resolve) => emitter.once(eventName, resolve));
}

function isAround(delay, real, precision = 200) {
  const diff = Math.abs(delay - real);
  // console.log("isAround", { delay, real, precision }, { diff });
  return diff <= precision;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
