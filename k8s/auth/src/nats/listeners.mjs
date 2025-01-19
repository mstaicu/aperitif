// @ts-check
import { jetstream } from "@nats-io/jetstream";

import { connection } from "./index.mjs";

/**
 * @param {function(import('@nats-io/jetstream').JsMsg): Promise<void>} handleSubscriptionCreated - A function to process subscription creation messages.
 */
export async function listenSubscriptionCreated(handleSubscriptionCreated) {
  var js = jetstream(connection);

  var { consume } = await js.consumers.get(
    "subscriptions",
    "auth-service.subscriptions.all",
  );

  for await (let m of await consume({ max_messages: 1 })) {
    await handleSubscriptionCreated(m);
  }
}
