// @ts-check
import { jetstream } from "@nats-io/jetstream";

/**
 * @typedef {import("@nats-io/jetstream").JsMsg} JsMsg
 * @typedef {import('@nats-io/transport-node').NatsConnection} NatsConnection
 */

/**
 *
 * @param {NatsConnection} connection
 */
export var registerSubscriptionConsumer = async (connection) => {
  var js = jetstream(connection);

  /**
   * These are defined in the Jetstream Custom Resources
   */
  var { consume } = await js.consumers.get("resources", "auth.subscriptions");

  /**
   * @param {(m: JsMsg) => Promise<void>} cb
   */
  return async (cb) => {
    for await (const m of await consume({ max_messages: 1 })) {
      await cb(m);
    }
  };
};
