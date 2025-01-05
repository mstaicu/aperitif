import { jetstream } from "@nats-io/jetstream";

/**
 *
 * @param {import('@nats-io/transport-node').NatsConnection} connection
 */
export var registerSubscriptionConsumer = async (connection) => {
  var js = jetstream(connection);

  var { consume } = await js.consumers.get("resources", "auth.subscriptions");

  return async (cb) => {
    for await (const m of await consume({ max_messages: 1 })) {
      await cb(m);
    }
  };
};
