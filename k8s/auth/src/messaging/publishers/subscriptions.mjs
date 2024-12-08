import { jetstream } from "@nats-io/jetstream";

/**
 * @typedef {import('@nats-io/transport-node').NatsConnection} NatsConnection
 */

/**
 * @param {NatsConnection} connection
 */
export var getSubscriptionCreatedPublisher = async (connection) => {
  var js = jetstream(connection);

  return (payload) =>
    js.publish("subscriptions.created", JSON.stringify(payload));
};
