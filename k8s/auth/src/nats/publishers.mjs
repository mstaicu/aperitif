import { jetstream } from "@nats-io/jetstream";

import { connection } from "./index.mjs";

export async function publishSubscriptionCreated(payload) {
  var js = jetstream(connection);
  return js.publish("subscriptions.created", JSON.stringify(payload));
}
