import {
  AccountCreatedV1Subject,
  CredentialAddedV1Subject,
  CredentialRemovedV1Subject,
  MembershipCreatedV1Subject,
  PrincipalRegisteredV1Subject,
  SessionEstablishedV1Subject,
  SessionRevokedV1Subject,
} from "@mstaicu/identity-contracts";
import { AckPolicy, DeliverPolicy } from "@nats-io/jetstream";

/**
 * Durable names belong to a dataset, not a Pod. Restart resumes; a fresh database
 * gets fresh cursors and reconstructs from retained state/events.
 * @param {{js: import("@nats-io/jetstream").JetStreamClient,
 * jsm: import("@nats-io/jetstream").JetStreamManager, pool: import("pg").Pool}} dependencies
 */
export async function identityConsumers({ js, jsm, pool }) {
  const {
    rows: [{ id }],
  } = await pool.query("SELECT id FROM ingest.dataset");
  const definitions = [
    {
      filter: { filter_subject: "identity.state.account.v1.*" },
      mode: DeliverPolicy.LastPerSubject,
      name: "accounts",
      stream: "IDENTITY_STATE",
    },
    {
      filter: { filter_subject: "identity.state.membership.v1.*" },
      mode: DeliverPolicy.LastPerSubject,
      name: "memberships",
      stream: "IDENTITY_STATE",
    },
    {
      // Future types and wire versions stay in the retained stream without
      // poisoning a consumer pinned to the contracts it understands.
      filter: {
        filter_subjects: [
          AccountCreatedV1Subject,
          CredentialAddedV1Subject,
          CredentialRemovedV1Subject,
          MembershipCreatedV1Subject,
          PrincipalRegisteredV1Subject,
          SessionEstablishedV1Subject,
          SessionRevokedV1Subject,
        ],
      },
      mode: DeliverPolicy.All,
      name: "events",
      stream: "IDENTITY_EVENTS",
    },
  ];
  return Promise.all(
    definitions.map(async ({ filter, mode, name, stream }) => {
      const durable = `analytics-${id}-${name}-v1`;
      try {
        const existing = await jsm.consumers.info(stream, durable);
        if (
          existing.config.filter_subject !== filter.filter_subject ||
          JSON.stringify(
            [...(existing.config.filter_subjects ?? [])].sort(),
          ) !== JSON.stringify([...(filter.filter_subjects ?? [])].sort()) ||
          existing.config.ack_policy !== AckPolicy.Explicit ||
          existing.config.deliver_policy !== mode
        ) {
          throw new Error("INCOMPATIBLE_IDENTITY_CONSUMER");
        }
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "ConsumerNotFoundError")
          throw error;
        await jsm.consumers.add(stream, {
          ack_policy: AckPolicy.Explicit,
          deliver_policy: mode,
          durable_name: durable,
          ...filter,
          max_ack_pending: 1,
        });
      }
      return js.consumers.get(stream, durable);
    }),
  );
}

/**
 * @param {{consumer: import("@nats-io/jetstream").Consumer,
 * handle: (message: import("@nats-io/jetstream").JsMsg) => Promise<void>,
 * signal: AbortSignal}} options
 */
export async function runConsumer({ consumer, handle, signal }) {
  const messages = await consumer.consume({ max_messages: 1 });
  const stop = () => messages.stop();
  signal.addEventListener("abort", stop, { once: true });
  if (signal.aborted) stop();
  try {
    for await (const message of messages) {
      await handle(message);
      message.ack();
    }
    const error = await messages.closed();
    if (error) throw error;
    if (!signal.aborted) throw new Error("CONSUMER_STOPPED_UNEXPECTEDLY");
  } finally {
    signal.removeEventListener("abort", stop);
    stop();
  }
}
