import { Type } from "typebox";
export declare const MembershipV1SubjectPrefix = "identity.membership.v1";
export declare const MembershipSnapshotV1Schema: Type.TObject<{
    data: Type.TObject<{
        account_id: Type.TString;
        id: Type.TString;
        role: Type.TUnion<[Type.TLiteral<"owner">, Type.TLiteral<"admin">, Type.TLiteral<"member">]>;
        status: Type.TUnion<[Type.TLiteral<"active">, Type.TLiteral<"inactive">]>;
        subject_id: Type.TString;
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
    type: Type.TLiteral<"identity.membership.snapshot.v1">;
}>;
export type MembershipSnapshotV1 = import("typebox").Static<typeof MembershipSnapshotV1Schema>;
/**
 * @param {MembershipSnapshotV1["data"]} data
 * @returns {MembershipSnapshotV1}
 */
export declare function buildMembershipSnapshotV1(data: MembershipSnapshotV1["data"]): MembershipSnapshotV1;
/**
 * @param {string} membershipId
 */
export declare function buildMembershipV1Subject(membershipId: string): string;
/**
 * @param {unknown} event
 * @returns {event is MembershipSnapshotV1}
 */
export declare function isMembershipSnapshotV1(event: unknown): event is MembershipSnapshotV1;
