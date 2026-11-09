import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { Compile } from "typebox/compile";

const source = "/domains/identity";
const type = "identity.session.established.v1";
export const SessionEstablishedV1Subject =
  "identity.events.session.established.v1";
const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-7][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const UuidSchema = Type.String({ pattern: uuidPattern });

export const SessionEstablishedV1Schema = Type.Object(
  {
    data: Type.Object(
      {
        expires_at: Type.String({
          description:
            "Natural expiry set at establishment, strictly later than time. Explicit revocation may occur earlier; this does not prove use.",
          format: "date-time",
        }),
        principal_id: {
          ...UuidSchema,
          description:
            "Affected authentication principal, not necessarily a unique human. Global facts do not imply an account attribution.",
        },
        session_id: {
          ...UuidSchema,
          description:
            "Opaque session record reference. Never a session token, token hash or proof of authority.",
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
      "One new session established, including the initial session after registration. Access-token minting and step-up proof do not establish sessions. The meaning aligns with CAEP Session Established; this local CloudEvents contract is not the CAEP wire protocol.",
    title: type,
  },
);

/** @typedef {import("typebox").Static<typeof SessionEstablishedV1Schema>} SessionEstablishedV1 */
const validator = Compile(SessionEstablishedV1Schema);

/**
 * @param {{ data: SessionEstablishedV1["data"], time: string }} args
 * @returns {SessionEstablishedV1}
 */
export function buildSessionEstablishedV1({ data, time }) {
  const event = {
    data: { ...data },
    id: randomUUID(),
    source,
    specversion: "1.0",
    time,
    type,
  };
  if (!isSessionEstablishedV1(event))
    throw new Error("INVALID_SESSION_ESTABLISHED_EVENT");
  return event;
}

/** @param {unknown} event @returns {event is SessionEstablishedV1} */
export function isSessionEstablishedV1(event) {
  return (
    validator.Check(event) &&
    Date.parse(event.data.expires_at) > Date.parse(event.time)
  );
}
