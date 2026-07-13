import { connect } from "@nats-io/transport-node";
import { GenericContainer, Wait } from "testcontainers";

/**
 * @typedef {{
 *   nc: Awaited<ReturnType<typeof connect>>,
 *   [Symbol.asyncDispose]: () => Promise<void>,
 * }} NatsFixture
 */

/**
 * @returns {Promise<NatsFixture>}
 */
export const startNats = async () => {
  const stack = new AsyncDisposableStack();

  try {
    const container = stack.adopt(
      await new GenericContainer("nats:2.14.3-alpine3.22")
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
        name: "entitlements-accounts-projector-test",
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

    return {
      nc,
      [Symbol.asyncDispose]: () => resources.disposeAsync(),
    };
  } catch (err) {
    await stack.disposeAsync().catch(() => {});

    throw err;
  }
};
