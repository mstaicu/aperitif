import { js } from "./index.mjs";

export async function listenSubscriptionCreated() {
  var c = await js.consumers.get("subscriptions", "auth_subscriptions_all");

  for await (let m of await c.consume({ max_messages: 1 })) {
    console.log("Received message:", m.data.toString());
    m.ack();
  }
}
