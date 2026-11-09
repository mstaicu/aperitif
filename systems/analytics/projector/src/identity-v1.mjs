import {
  AccountCreatedV1Subject,
  buildAccountV1Subject,
  buildMembershipV1Subject,
  CredentialAddedV1Subject,
  CredentialRemovedV1Subject,
  isAccountCreatedV1,
  isAccountSnapshotV1,
  isCredentialAddedV1,
  isCredentialRemovedV1,
  isMembershipCreatedV1,
  isMembershipSnapshotV1,
  isPrincipalRegisteredV1,
  isSessionEstablishedV1,
  isSessionRevokedV1,
  MembershipCreatedV1Subject,
  PrincipalRegisteredV1Subject,
  SessionEstablishedV1Subject,
  SessionRevokedV1Subject,
} from "@mstaicu/identity-contracts";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";

/**
 * Validate the actual transport subject before applying any database effect.
 * @param {{ pool: import("pg").Pool }} dependencies
 * @param {import("@nats-io/jetstream").JsMsg} message
 */
export async function projectIdentityV1({ pool }, message) {
  const event = /** @type {unknown} */ (message.json());
  const account = isAccountSnapshotV1(event);
  const membership = isMembershipSnapshotV1(event);
  if (
    !(account && message.subject === buildAccountV1Subject(event.data.id)) &&
    !(
      membership && message.subject === buildMembershipV1Subject(event.data.id)
    ) &&
    !(
      isPrincipalRegisteredV1(event) &&
      message.subject === PrincipalRegisteredV1Subject
    ) &&
    !(
      isAccountCreatedV1(event) && message.subject === AccountCreatedV1Subject
    ) &&
    !(
      isMembershipCreatedV1(event) &&
      message.subject === MembershipCreatedV1Subject
    ) &&
    !(
      isCredentialAddedV1(event) && message.subject === CredentialAddedV1Subject
    ) &&
    !(
      isCredentialRemovedV1(event) &&
      message.subject === CredentialRemovedV1Subject
    ) &&
    !(
      isSessionEstablishedV1(event) &&
      message.subject === SessionEstablishedV1Subject
    ) &&
    !(isSessionRevokedV1(event) && message.subject === SessionRevokedV1Subject)
  ) {
    throw new Error("INVALID_IDENTITY_MESSAGE");
  }

  const parent = propagation.extract(context.active(), {
    traceparent: message.headers?.get("traceparent"),
    tracestate: message.headers?.get("tracestate"),
  });
  return trace.getTracer("analytics-projector").startActiveSpan(
    "identity.project",
    {
      attributes: {
        "messaging.destination.name": message.subject,
        "messaging.message.id": event.id,
        "messaging.operation.name": "project",
        "messaging.operation.type": "process",
        "messaging.system": "nats",
      },
      kind: SpanKind.CONSUMER,
    },
    parent,
    async (span) => {
      let client;
      try {
        client = await pool.connect();
        await client.query("BEGIN");
        if (account) {
          const { created_at, id, name, version } = event.data;
          await client.query(
            `INSERT INTO model.identity_accounts (id, name, created_at, version)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name,
               created_at = EXCLUDED.created_at, version = EXCLUDED.version
             WHERE model.identity_accounts.version < EXCLUDED.version`,
            [id, name, created_at, version],
          );
        } else if (membership) {
          const { account_id, created_at, id, principal_id, roles, version } =
            event.data;
          await client.query(
            `INSERT INTO model.identity_memberships
               (id, account_id, principal_id, roles, created_at, version)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET account_id = EXCLUDED.account_id,
               principal_id = EXCLUDED.principal_id, roles = EXCLUDED.roles,
               created_at = EXCLUDED.created_at, version = EXCLUDED.version
             WHERE model.identity_memberships.version < EXCLUDED.version`,
            [id, account_id, principal_id, roles, created_at, version],
          );
        } else {
          await client.query(
            `INSERT INTO ingest.events
               (source, id, type, occurred_at, event)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (source, id) DO NOTHING`,
            [event.source, event.id, event.type, event.time, event],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client?.query("ROLLBACK").catch(() => {});
        span.recordException(/** @type {Error} */ (error));
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        client?.release();
        span.end();
      }
    },
  );
}
