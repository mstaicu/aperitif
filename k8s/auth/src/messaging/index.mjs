// @ts-check
import { connect as natsConnect } from "@nats-io/transport-node";

import { registerSubscriptionConsumer } from "./consumers/index.mjs";
import { getSubscriptionCreatedPublisher } from "./publishers/index.mjs";

/**
 * @typedef {import('@nats-io/transport-node').NatsConnection} NatsConnection
 * @type {NatsConnection}
 */
var connection;

/**
 * @typedef {import("@nats-io/transport-node").ConnectionOptions} ConnectionOptions
 * @param {ConnectionOptions} options
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
