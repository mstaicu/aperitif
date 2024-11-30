// @ts-check
import { jetstream } from "@nats-io/jetstream";

/**
 *
 * @param {import('@nats-io/transport-node').NatsConnection} connection
 */
export var registerSubscriptionConsumer = async (connection) => {
  var js = jetstream(connection);

  /**
   * These are defined in the Jetstream Custom Resources
   */
  var { consume } = await js.consumers.get("resources", "auth.subscriptions");

  /**
   * @typedef {import("@nats-io/jetstream").JsMsg} JsMsg
   * @param {(m: JsMsg) => Promise<void>} cb
   */
  return async (cb) => {
    for await (const m of await consume({ max_messages: 1 })) {
      await cb(m);
    }
  };
};
