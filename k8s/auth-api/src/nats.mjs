import {
  credsAuthenticator,
  connect as natsConnect,
} from "@nats-io/transport-node";
import { readFileSync } from "fs";
import nconf from "nconf";

var authenticator = credsAuthenticator(
  new Uint8Array(readFileSync(nconf.get("NATS_CREDS_KEY_PATH"))),
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
    name: "auth-api",
    servers,
  });

  return nc;
}
