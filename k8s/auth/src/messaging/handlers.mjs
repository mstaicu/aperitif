/**
 * @param {import('@nats-io/jetstream').JsMsg} msg
 */
export async function handleSubscriptionCreated(msg) {
  console.log("Received message:", msg.data.toString());

  msg.ack();
}
