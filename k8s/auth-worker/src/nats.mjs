import {
  credsAuthenticator,
  connect as natsConnect,
} from "@nats-io/transport-node";
import { readFileSync } from "fs";

var authenticator = credsAuthenticator(
  new Uint8Array(readFileSync("/nats/auth-worker.creds")),
);

var servers = Array.from(Array(3)).map(
  (_, index) =>
    `nats://nats-depl-${index}.nats-headless.nats.svc.cluster.local:4222`,
);

/**
 * @type {import("@nats-io/transport-node").NatsConnection}
 */
var nc;

export async function connect() {
  if (nc) return nc;

  nc = await natsConnect({
    authenticator,
    name: "auth-worker",
    servers,
  });

  return nc;
}
