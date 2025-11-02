/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 */
export var getHealthzHandler =
  () =>
  /**
   * @type {import("express").RequestHandler}
   */
  (_, res) =>
    res.sendStatus(200);

/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 */
export var getReadyzHandler =
  (mc, nc) =>
  /**
   * @type {import("express").RequestHandler}
   */ (_, res) =>
    res.sendStatus(mc.readyState === 1 && !nc.isClosed() ? 200 : 503);
