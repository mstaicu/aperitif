import { connect as natsConnect } from "@nats-io/transport-node";

import { registerSubscriptionConsumer } from "./consumers/index.mjs";
import { getSubscriptionCreatedPublisher } from "./publishers/index.mjs";

/**
 * @type {import('@nats-io/transport-node').NatsConnection}
 */
var connection;

/**
 * @param {import("@nats-io/transport-node").ConnectionOptions} options
 */
var connect = async (options) => {
  connection = await natsConnect(options);
  return connection;
};

export {
  connect,
  connection,
  getSubscriptionCreatedPublisher,
  registerSubscriptionConsumer,
};
