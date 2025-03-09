import { jetstream } from "@nats-io/jetstream";

import { connection } from "./index.mjs";

var js = jetstream(connection);

export async function publishSubscriptionCreated(payload) {
  return js.publish("subscriptions.created", JSON.stringify(payload));
}
