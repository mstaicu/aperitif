// @ts-check

/**
 * @returns {import("express").RequestHandler}
 */
export var getHealthzHandler = () => (_, res) => res.sendStatus(200);

/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 * @returns {import("express").RequestHandler}
 */
export var getReadyzHandler = (mc, nc) => (_, res) =>
  res.sendStatus(mc.readyState === 1 && !nc.isClosed() ? 200 : 503);
