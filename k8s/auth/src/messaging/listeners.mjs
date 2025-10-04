import { js, jsm } from "./index.mjs";

export async function getOrCreateConsumer(stream, durableName, filterSubject) {
  let consumer;

  try {
    consumer = await js.consumers.get(stream, durableName);
  } catch {
    consumer = await jsm.consumers.add(stream, {
      ack_policy: "explicit",
      deliver_policy: "all",
      durable_name: durableName,
      filter_subject: filterSubject,
    });
  }

  return consumer;
}

export async function listenSubscriptionCreated() {
  // var c = await getOrCreateConsumer();
  var c = await js.consumers.get("subscriptions", "auth_subscriptions_all");

  for await (let m of await c.consume({ max_messages: 1 })) {
    console.log("Received message:", m.data.toString());
    m.ack();
  }
}
