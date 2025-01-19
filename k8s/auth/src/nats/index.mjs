import { connect as natsConnect } from "@nats-io/transport-node";

/**
 * @type {import('@nats-io/transport-node').NatsConnection}
 */
var connection;

// var creds = nconf.get("NATS_USERS_AUTH_CREDS");
// var authenticator = credsAuthenticator(new TextEncoder().encode(creds));

/**
 * @param {import("@nats-io/transport-node").ConnectionOptions} options
 */
var connect = async (options) => {
  connection = await natsConnect(options);
  return connection;
};

export { connect, connection };
