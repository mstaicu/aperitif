import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import {
  credsAuthenticator,
  connect as natsConnect,
} from "@nats-io/transport-node";
import { readFileSync } from "fs";

/**
 * @type {import("@nats-io/transport-node").NatsConnection}
 */
var nc;

export async function connect() {
  if (nc) return nc;

  var authenticator = credsAuthenticator(
    new Uint8Array(readFileSync("/secrets/auth.creds")),
  );

  var servers = Array.from(Array(3)).map(
    (_, index) =>
      `nats://nats-depl-${index}.nats-headless.nats.svc.cluster.local:4222`,
  );

  nc = await natsConnect({
    authenticator,
    servers,
  });

  return nc;
}
