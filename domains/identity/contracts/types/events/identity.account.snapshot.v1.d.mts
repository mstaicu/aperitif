import { Type } from "typebox";
export declare const AccountV1SubjectPrefix = "identity.account.v1";
export declare const AccountSnapshotV1Schema: Type.TObject<{
  data: Type.TObject<{
    created_at: Type.TString;
    id: Type.TString;
    name: Type.TString;
    version: Type.TInteger;
  }>;
  datacontenttype: Type.TLiteral<"application/json">;
  dataschema: Type.TOptional<Type.TString>;
  id: Type.TString;
  source: Type.TLiteral<"/domains/identity">;
  specversion: Type.TLiteral<"1.0">;
  subject: Type.TString;
  time: Type.TString;
  traceparent: Type.TOptional<Type.TString>;
  tracestate: Type.TOptional<Type.TString>;
  type: Type.TLiteral<"identity.account.snapshot.v1">;
}>;
export type AccountSnapshotV1 = import("typebox").Static<
  typeof AccountSnapshotV1Schema
>;
/**
 * @param {AccountSnapshotV1["data"]} data
 * @returns {AccountSnapshotV1}
 */
export declare function buildAccountSnapshotV1(
  data: AccountSnapshotV1["data"],
): AccountSnapshotV1;
/**
 * @param {string} accountId
 */
export declare function buildAccountV1Subject(accountId: string): string;
/**
 * @param {unknown} event
 * @returns {event is AccountSnapshotV1}
 */
export declare function isAccountSnapshotV1(
  event: unknown,
): event is AccountSnapshotV1;
