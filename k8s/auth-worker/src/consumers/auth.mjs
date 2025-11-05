// @ts-check
import { jetstream } from "@nats-io/jetstream";

/**
 * @param {import('@nats-io/transport-node').NatsConnection} nc
 */
export async function startAuthConsumer(nc) {
  var js = jetstream(nc);

  var c = await js.consumers.get("auth", "auth-worker");

  for await (let m of await c.consume({ max_messages: 1 })) {
    await handler(m);
  }
}

/**
 *
 * @param {import('@nats-io/jetstream').JsMsg} msg
 */
async function handler(msg) {
  console.log(msg.subject);
  msg.ack();
}
