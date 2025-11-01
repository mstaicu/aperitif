/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 */
export var getServiceAvailabilityLayer = (mc, nc) => {
  /**
   * @type {import("express").RequestHandler}
   */
  var handler = (req, res, next) => {
    if (mc.readyState !== 1 || nc.isClosed()) {
      return res.status(503).json({
        instance: req.originalUrl,
        status: 503,
        title: "Service Unavailable",
      });
    }

    next();
  };

  return { handlers: [handler], method: "use" };
};
