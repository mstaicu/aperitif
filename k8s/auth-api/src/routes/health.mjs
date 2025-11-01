/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 */
export var getHealthzRoute = () => {
  /**
   * @type {import("express").RequestHandler}
   */
  var handler = (_, res) => res.sendStatus(200);

  return {
    handlers: [handler],
    method: "get",
    openapi: {
      responses: { 200: { description: "Service is healthy" } },
      summary: "Liveness probe",
      tags: ["health"],
    },
    path: "/healthz",
  };
};

/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 */
export var getReadyzRoute = (mc, nc) => {
  /**
   * @type {import("express").RequestHandler}
   */
  var handler = (_, res) =>
    res.sendStatus(mc.readyState === 1 && !nc.isClosed() ? 200 : 503);

  return {
    handlers: [handler],
    method: "get",
    openapi: {
      responses: {
        200: { description: "Service is ready" },
        503: { description: "Dependencies unavailable" },
      },
      summary: "Readiness probe",
      tags: ["health"],
    },
    path: "/readyz",
  };
};
