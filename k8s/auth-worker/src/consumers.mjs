// @ts-check
import { jetstream } from "@nats-io/jetstream";

import { connect } from "./nats.mjs";

var nc = await connect();
var js = jetstream(nc);

var c = await js.consumers.get("auth", "auth-worker");

for await (let m of await c.consume({ max_messages: 1 })) {
  await foo(m);
}

/**
 *
 * @param {import('@nats-io/jetstream').JsMsg} msg
 */
async function foo(msg) {
  console.log(msg);
}
