import { jetstream } from "@nats-io/jetstream";

/**
 * @param {import('@nats-io/transport-node').NatsConnection} connection
 */
export var getSubscriptionCreatedPublisher = async (connection) => {
  var js = jetstream(connection);

  return (payload) =>
    js.publish("subscriptions.created", JSON.stringify(payload));
};
