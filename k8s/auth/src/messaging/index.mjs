import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import {
  credsAuthenticator,
  connect as natsConnect,
} from "@nats-io/transport-node";
import { existsSync, readFileSync } from "fs";

var defaultCredsPath = "/secrets/auth.creds";

if (!existsSync(defaultCredsPath)) {
  throw new Error("NATS credentials file missing");
}

/**
 * @type {import("@nats-io/transport-node").NatsConnection}
 */
var nc;
/**
 * @type {import("@nats-io/jetstream").JetStreamClient}
 */
var js;
/**
 * @type {import("@nats-io/jetstream").JetStreamManager}
 */
var jsm;

/**
 * @param {import("@nats-io/transport-node").ConnectionOptions} options
 */
async function connect(options = {}) {
  nc = await natsConnect({
    authenticator: credsAuthenticator(
      new Uint8Array(readFileSync(defaultCredsPath)),
    ),
    reconnectTimeWait: 5000,
    servers: "nats://nats:4222", // ClusterIP service
    ...options,
  });

  js = jetstream(nc);
  jsm = jetstreamManager(nc);

  return nc;
}

export { connect, js, jsm, nc };
