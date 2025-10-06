// @ts-check
import { AckPolicy, DeliverPolicy } from "@nats-io/jetstream";

/**
 * @typedef {Object} ConsumerConfig
 * @property {string} name - The durable consumer name.
 * @property {string} stream - The name of the stream.
 * @property {Partial<import("@nats-io/jetstream").ConsumerConfig>} options - Consumer options.
 * @property {(m: import("@nats-io/jetstream").JsMsg) => Promise<void>|void} listener - Message listener function.
 */

/** @type {ConsumerConfig[]} */
export var consumers = [
  {
    listener: (msg) => console.log(msg.json()),
    name: "auth-worker.subscriptions",
    options: {
      ack_policy: AckPolicy.All,
      deliver_policy: DeliverPolicy.All,
      durable_name: "auth-worker.subscriptions",
    },
    stream: "subscriptions",
  },
];

/**
 * @param {import("@nats-io/jetstream").JetStreamClient} js
 * @param {import("@nats-io/jetstream").JetStreamManager} jsm
 * @param {ConsumerConfig[]} configs
 */
export async function registerConsumers(js, jsm, configs) {
  for (const { listener, name, options, stream } of configs) {
    /**
     * @type {import("@nats-io/jetstream").Consumer}
     */
    var c;

    try {
      c = await js.consumers.get(stream, name);
    } catch {
      await jsm.consumers.add(stream, options);
      c = await js.consumers.get(stream, name);
    }

    (async () => {
      for await (let m of await c.consume({ max_messages: 1 })) {
        await listener(m);
      }
    })();
  }
}
