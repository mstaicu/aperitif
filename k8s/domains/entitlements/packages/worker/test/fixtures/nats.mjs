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
  const stack = new AsyncDisposableStack();

  try {
    const container = stack.adopt(
      await new GenericContainer("nats:2.14.2-alpine")
        .withCommand(["-js"])
        .withExposedPorts(4222)
        .withWaitStrategy(Wait.forListeningPorts())
        .start(),
      async (container) => {
        await container.stop();
      },
    );

    const nc = stack.adopt(
      await connect({
        name: "entitlements-worker-test",
        servers: [`nats://localhost:${container.getMappedPort(4222)}`],
      }),
      async (nc) => {
        if (!nc.isClosed()) {
          await nc.drain();
          await nc.closed();
        }
      },
    );

    const resources = stack.move();
    const close = () => resources.disposeAsync();

    return {
      close,
      js: jetstream(nc),
      jsm: await jetstreamManager(nc),
      nc,
      [Symbol.asyncDispose]: close,
    };
  } catch (err) {
    await stack.disposeAsync().catch(() => {});

    throw err;
  }
};
