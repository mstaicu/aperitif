import { connect } from "@nats-io/transport-node";
import { GenericContainer, Wait } from "testcontainers";

export const startNats = async ({ jetstream = true } = {}) => {
  await using stack = new AsyncDisposableStack();

  const container = stack.use(
    await new GenericContainer("nats:2.14.5-alpine3.22")
      .withCommand(jetstream ? ["-js"] : [])
      .withExposedPorts(4222)
      .withWaitStrategy(Wait.forListeningPorts())
      .start(),
  );
  const nc = stack.use(
    await connect({
      name: "outbox-relay-test",
      servers: [`nats://localhost:${container.getMappedPort(4222)}`],
    }),
  );
  const resources = stack.move();

  return {
    nc,
    [Symbol.asyncDispose]: () => resources.disposeAsync(),
  };
};
