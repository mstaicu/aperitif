import {
  DiscardPolicy,
  jetstreamManager,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const ENTITLEMENTS_STREAM = "ENTITLEMENTS";

/**
 * @param {{
 *   nc: import("@nats-io/transport-node").NatsConnection,
 *   streamMaxBytes: number,
 *   streamReplicas: number,
 * }} args
 */
export async function createEntitlementsStream({
  nc,
  streamMaxBytes,
  streamReplicas,
}) {
  const jsm = await jetstreamManager(nc);

  const config = {
    discard: DiscardPolicy.New,
    max_bytes: streamMaxBytes,
    name: ENTITLEMENTS_STREAM,
    num_replicas: streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["entitlements.>"],
  };

  return jsm.streams.add(config);
}
