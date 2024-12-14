// @ts-check
import {
  AckPolicy,
  DeliverPolicy,
  jetstream,
  jetstreamManager,
  RetentionPolicy,
} from "@nats-io/jetstream";
import { connect, credsAuthenticator, nanos } from "@nats-io/transport-node";
import nconf from "nconf";

var creds = nconf.get("NATS_USERS_AUTH_CREDS");
var authenticator = credsAuthenticator(new TextEncoder().encode(creds));

var con = await connect({
  authenticator,
  servers: [
    "http://nats-depl-0:4222",
    "http://nats-depl-1:4222",
    "http://nats-depl-2:4222",
  ],
});

var STREAM_NAME = "resources";
var SUBSCRIPTIONS = "subscriptions.*";

var SUBSCRIPTIONS_ACTIONS = Object.freeze({
  CREATE: "subscriptions.created",
  DELETE: "subscriptions.deleted",
  UPDATE: "subscriptions.updated",
});

var SUBSCRIPTIONS_CONSUMER = "auth.subscription.actions";

var jsm = await jetstreamManager(con);

try {
  await jsm.streams.info(SUBSCRIPTIONS);
} catch {
  await jsm.streams.add({
    name: STREAM_NAME,
    retention: RetentionPolicy.Interest,
    subjects: Object.values(SUBSCRIPTIONS_ACTIONS),
  });
}

var js = jetstream(con);

await js.publish(
  SUBSCRIPTIONS_ACTIONS.CREATE,
  JSON.stringify({ date: new Date().toISOString() }),
);

try {
  await js.consumers.get(STREAM_NAME, SUBSCRIPTIONS_CONSUMER);
} catch {
  await jsm.consumers.add(STREAM_NAME, {
    ack_policy: AckPolicy.Explicit,
    ack_wait: nanos(60 * 1000),
    deliver_policy: DeliverPolicy.All,
    durable_name: SUBSCRIPTIONS_CONSUMER,
    filter_subjects: Object.values(SUBSCRIPTIONS_ACTIONS),
  });
}

var { consume } = await js.consumers.get(STREAM_NAME, SUBSCRIPTIONS_CONSUMER);

for await (const m of await consume({ max_messages: 1 })) {
  console.log(m.json());
  m.ack();
}
