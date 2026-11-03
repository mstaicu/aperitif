import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { Compile } from "typebox/compile";

const source = "/domains/identity";
const type = "identity.credential.added.v1";
export const CredentialAddedV1Subject = "identity.events.credential.added.v1";
const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-7][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const UuidSchema = Type.String({ pattern: uuidPattern });

export const CredentialAddedV1Schema = Type.Object(
  {
    data: Type.Object(
      {
        credential_ref: {
          ...UuidSchema,
          description:
            "Internal opaque credential reference. Never a WebAuthn credential ID, key, label, secret or bearer capability.",
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
      "One verified passkey added, including the first passkey. The opaque credential reference is not a WebAuthn credential ID or key.",
    title: type,
  },
);

/** @typedef {import("typebox").Static<typeof CredentialAddedV1Schema>} CredentialAddedV1 */
const validator = Compile(CredentialAddedV1Schema);

/**
 * @param {{ data: CredentialAddedV1["data"], time: string }} args
 * @returns {CredentialAddedV1}
 */
export function buildCredentialAddedV1({ data, time }) {
  const event = {
    data: { ...data },
    id: randomUUID(),
    source,
    specversion: "1.0",
    time,
    type,
  };
  if (!isCredentialAddedV1(event))
    throw new Error("INVALID_CREDENTIAL_ADDED_EVENT");
  return event;
}

/** @param {unknown} event @returns {event is CredentialAddedV1} */
export function isCredentialAddedV1(event) {
  return validator.Check(event);
}
