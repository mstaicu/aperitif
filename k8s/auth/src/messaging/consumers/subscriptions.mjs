// @ts-check
import { jetstream } from "@nats-io/jetstream";

var STREAM_NAME = "resources";
var SUBSCRIPTIONS_CONSUMER = "auth.subscription.actions";

/**
 *
 * @param {import('@nats-io/transport-node').NatsConnection} connection
 */
export var registerSubscriptionCreatedConsumer = async (connection) => {
  var js = jetstream(connection);

  var { consume } = await js.consumers.get(STREAM_NAME, SUBSCRIPTIONS_CONSUMER);

  for await (const m of await consume({ max_messages: 1 })) {
    console.log(m.json());
    m.ack();
  }
};
