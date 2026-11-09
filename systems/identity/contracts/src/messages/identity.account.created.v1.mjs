import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { Compile } from "typebox/compile";

const source = "/domains/identity";
const type = "identity.account.created.v1";
export const AccountCreatedV1Subject = "identity.events.account.created.v1";
const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-7][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const UuidSchema = Type.String({ pattern: uuidPattern });

export const AccountCreatedV1Schema = Type.Object(
  {
    data: Type.Object(
      {
        account_id: {
          ...UuidSchema,
          description:
            "Opaque account identity and cross-domain attribution key.",
        },
        principal_id: {
          ...UuidSchema,
          description:
            "Verified authentication principal that created the account, not necessarily a unique human.",
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
      "One account created by principal_id, atomically with its initial owner membership. The separate snapshot supplies current exported account state.",
    title: type,
  },
);

/** @typedef {import("typebox").Static<typeof AccountCreatedV1Schema>} AccountCreatedV1 */
const validator = Compile(AccountCreatedV1Schema);

/**
 * @param {{ data: AccountCreatedV1["data"], time: string }} args
 * @returns {AccountCreatedV1}
 */
export function buildAccountCreatedV1({ data, time }) {
  const event = {
    data: { ...data },
    id: randomUUID(),
    source,
    specversion: "1.0",
    time,
    type,
  };
  if (!isAccountCreatedV1(event))
    throw new Error("INVALID_ACCOUNT_CREATED_EVENT");
  return event;
}

/** @param {unknown} event @returns {event is AccountCreatedV1} */
export function isAccountCreatedV1(event) {
  return validator.Check(event);
}
