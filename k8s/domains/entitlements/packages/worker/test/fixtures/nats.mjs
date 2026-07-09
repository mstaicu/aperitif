import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { GenericContainer, Wait } from "testcontainers";

/**
 * @typedef {{
 *   close: () => Promise<void>,
 *   js: ReturnType<typeof jetstream>,
 *   jsm: Awaited<ReturnType<typeof jetstreamManager>>,
 *   nc: Awaited<ReturnType<typeof connect>>,
 * } & AsyncDisposable} NatsFixture
 */

/**
 * @returns {Promise<NatsFixture>}
 */
export const startNats = async () => {
  /** @type {import("testcontainers").StartedTestContainer | undefined} */
  let container;

  /** @type {NatsFixture | undefined} */
  let nats;

  try {
    container = await new GenericContainer("nats:2.14.2-alpine")
      .withCommand(["-js"])
      .withExposedPorts(4222)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    const nc = await connect({
      name: "entitlements-worker-test",
      servers: [`nats://localhost:${container.getMappedPort(4222)}`],
    });

    nats = Object.assign(
      {},
      {
        close: async () => {
          if (!nc.isClosed()) {
            await nc.drain();
            await nc.closed();
          }
        },
        js: jetstream(nc),
        jsm: await jetstreamManager(nc),
        nc,
      },
      {
        async [Symbol.asyncDispose]() {
          await nats?.close().catch(() => {});
          await container?.stop().catch(() => {});
        },
      },
    );

    return nats;
  } catch (err) {
    await nats?.close().catch(() => {});
    await container?.stop().catch(() => {});

    throw err;
  }
};
