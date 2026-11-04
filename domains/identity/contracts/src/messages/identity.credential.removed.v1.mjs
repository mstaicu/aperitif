import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { Compile } from "typebox/compile";

const source = "/domains/identity";
const type = "identity.credential.removed.v1";
export const CredentialRemovedV1Subject =
  "identity.events.credential.removed.v1";
const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-7][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const UuidSchema = Type.String({ pattern: uuidPattern });

export const CredentialRemovedV1Schema = Type.Object(
  {
    data: Type.Object(
      {
        credential_id: {
          ...UuidSchema,
          description:
            "Opaque credential record ID. Never a WebAuthn credential ID, key, label, secret or bearer capability.",
        },
        principal_id: {
          ...UuidSchema,
          description:
            "Affected authentication principal, not necessarily a unique human. Global facts do not imply an account attribution.",
        },
      },
      { additionalProperties: false },
    ),
    id: {
      ...UuidSchema,
      description:
        "Fact identity persisted once in the source outbox. Retries preserve it and its payload; deduplicate by (source,id).",
    },
    source: Type.Literal(source, {
      description:
        "Logical source within this platform deployment, not an authenticated publisher identity or query URL.",
    }),
    specversion: Type.Literal("1.0"),
    time: Type.String({
      description:
        "Source mutation time from PostgreSQL clock_timestamp() after the relevant lock, serialized as UTC milliseconds. Stable across retries; not commit, publication or ingestion time, or total ordering. Published only after commit.",
      format: "date-time",
    }),
    type: Type.Literal(type, {
      description:
        "Versioned fact meaning and payload contract, separate from CloudEvents specversion and resource revision.",
    }),
  },
  {
    additionalProperties: false,
    description:
      "One passkey removed after fresh proof. Removing the last authentication method is rejected.",
    title: type,
  },
);

/** @typedef {import("typebox").Static<typeof CredentialRemovedV1Schema>} CredentialRemovedV1 */
const validator = Compile(CredentialRemovedV1Schema);

/**
 * @param {{ data: CredentialRemovedV1["data"], time: string }} args
 * @returns {CredentialRemovedV1}
 */
export function buildCredentialRemovedV1({ data, time }) {
  const event = {
    data: { ...data },
    id: randomUUID(),
    source,
    specversion: "1.0",
    time,
    type,
  };
  if (!isCredentialRemovedV1(event))
    throw new Error("INVALID_CREDENTIAL_REMOVED_EVENT");
  return event;
}

/** @param {unknown} event @returns {event is CredentialRemovedV1} */
export function isCredentialRemovedV1(event) {
  return validator.Check(event);
}
