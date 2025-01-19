import {
  AckPolicy,
  DeliverPolicy,
  jetstreamManager,
  RetentionPolicy,
} from "@nats-io/jetstream";

import { connection } from "./index.mjs";

export async function ensureSubscriptionsStreamAndConsumers() {
  var jsm = await jetstreamManager(connection);

  try {
    var streamName = "subscriptions";
    var subjects = ["subscriptions.*"];

    await jsm.streams.info(streamName);
  } catch {
    await jsm.streams.add({
      name: streamName,
      retention: RetentionPolicy.Interest,
      subjects,
    });
  }

  var durableName = "auth-service.subscriptions.all";

  try {
    await jsm.consumers.info(streamName, durableName);
  } catch {
    await jsm.consumers.add(streamName, {
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      durable_name: durableName,
    });
  }
}
