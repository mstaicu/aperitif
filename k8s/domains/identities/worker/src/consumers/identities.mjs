import { jetstream } from "@nats-io/jetstream";

/**
 * @param {import('@nats-io/transport-node').NatsConnection} nc
 */
export async function startIdentitiesConsumer(nc) {
  const c = await jetstream(nc).consumers.get(
    "identities",
    "identities-worker",
  );
  const it = await c.consume({ max_messages: 1 });

  let running = true;

  // We need to run it in the background, otherwise the return will not be reached
  (async () => {
    for await (const m of it) {
      if (!running) break;

      try {
        await handleIdentitiesEvent(m);
        m.ack();
      } catch {
        m.nak();
      }
    }
  })();

  return async () => {
    running = false;
    it.stop();
  };
}

/**
 *
 * @param {import('@nats-io/jetstream').JsMsg} msg
 */
async function handleIdentitiesEvent(msg) {
  console.log(msg.subject);
  msg.ack();
}
