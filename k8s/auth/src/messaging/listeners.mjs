import { jetstream } from "@nats-io/jetstream";

import { handleSubscriptionCreated } from "./handlers.mjs";
import { connection } from "./index.mjs";

var stream = "subscriptions";
var consumer = "auth_subscriptions_all";

var js = jetstream(connection);

export async function listenSubscriptionCreated() {
  var c = await js.consumers.get(stream, consumer);

  for await (let m of await c.consume({ max_messages: 1 })) {
    await handleSubscriptionCreated(m);
  }
}
