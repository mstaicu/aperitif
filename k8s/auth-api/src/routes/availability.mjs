/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 */
export var getServiceAvailabilityLayer = (mc, nc) => {
  /**
   * @type {import("express").RequestHandler}
   */
  var handler = (_, res, next) => {
    if (mc.readyState !== 1 || nc.isClosed()) {
      return res.status(503);
    }

    next();
  };

  return { handlers: [handler], method: "use" };
};
