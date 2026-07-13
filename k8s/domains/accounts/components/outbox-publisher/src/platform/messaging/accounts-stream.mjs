import {
  DiscardPolicy,
  jetstreamManager,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const ACCOUNTS_STREAM = "ACCOUNTS";

/**
 * @param {{
 *   nc: import("@nats-io/transport-node").NatsConnection,
 *   streamMaxBytes: number,
 *   streamReplicas: number,
 * }} args
 */
export async function createAccountsStream({
  nc,
  streamMaxBytes,
  streamReplicas,
}) {
  const jsm = await jetstreamManager(nc);

  const config = {
    discard: DiscardPolicy.New,
    max_bytes: streamMaxBytes,
    name: ACCOUNTS_STREAM,
    num_replicas: streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["accounts.>"],
  };

  return jsm.streams.add(config);
}
