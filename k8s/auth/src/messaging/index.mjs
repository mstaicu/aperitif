import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import {
  credsAuthenticator,
  connect as natsConnect,
} from "@nats-io/transport-node";
import { existsSync, readFileSync } from "fs";
import nconf from "nconf";

var defaultCredsPath = "/secrets/auth.creds";

if (!existsSync(defaultCredsPath)) {
  throw new Error("NATS credentials file missing");
}

/**
 * @type {import("@nats-io/transport-node").NatsConnection}
 */
var nc;
/**
 * @type {import("@nats-io/jetstream").JetStreamManager}
 */
var jsm;
/**
 * @type {import("@nats-io/jetstream").JetStreamClient}
 */
var js;

/**
 * @param {import("@nats-io/transport-node").ConnectionOptions} options
 */
async function connect(options = {}) {
  var servers = [
    `nats://nats-depl-0.nats-headless.${nconf.get("NAMESPACE")}.svc.cluster.local:4222`,
    `nats://nats-depl-1.nats-headless.${nconf.get("NAMESPACE")}.svc.cluster.local:4222`,
    `nats://nats-depl-2.nats-headless.${nconf.get("NAMESPACE")}.svc.cluster.local:4222`,
  ];

  nc = await retryWithBackoff(() =>
    natsConnect({
      authenticator: credsAuthenticator(
        new Uint8Array(readFileSync(defaultCredsPath)),
      ),
      maxReconnectAttempts: -1,
      servers,
      ...options,
    }),
  );

  jsm = await jetstreamManager(nc);
  js = jetstream(nc);

  return nc;
}

/**
 * Recursive function to retry connection with exponential backoff.
 * @param {function} fn - The async function to retry.
 * @param {number} attempt - Current retry attempt.
 * @param {number} maxRetries - Maximum retry attempts.
 * @param {number} baseDelay - Initial delay in milliseconds.
 */
async function retryWithBackoff(
  fn,
  attempt = 0,
  maxRetries = 5,
  baseDelay = 1000,
) {
  try {
    return await fn();
  } catch (error) {
    if (attempt >= maxRetries) {
      throw error;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, baseDelay * Math.pow(2, attempt)),
    );

    return retryWithBackoff(fn, attempt + 1, maxRetries, baseDelay);
  }
}

export { connect, js, jsm, nc };
