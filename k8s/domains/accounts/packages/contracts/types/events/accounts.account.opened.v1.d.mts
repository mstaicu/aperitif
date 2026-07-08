/**
 * @param {Omit<AccountOpenedV1Data, "version">} data
 * @param {number} version
 * @returns {AccountOpenedV1Event}
 */
export function buildAccountOpenedV1Event(data: Omit<AccountOpenedV1Data, "version">, version: number): AccountOpenedV1Event;
export const AccountOpenedV1Source: "/domains/accounts";
export const AccountOpenedV1Type: "accounts.account.opened.v1";
export const AccountOpenedV1DataSchema: import("@sinclair/typebox").TObject<{
    account: import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"personal">, import("@sinclair/typebox").TLiteral<"business">]>;
    }>;
    member: import("@sinclair/typebox").TObject<{
        role: import("@sinclair/typebox").TString;
        user_id: import("@sinclair/typebox").TString;
    }>;
    version: import("@sinclair/typebox").TInteger;
}>;
export const AccountOpenedV1EventSchema: import("@sinclair/typebox").TObject<{
    datacontenttype: import("@sinclair/typebox").TLiteral<"application/json">;
    data: import("@sinclair/typebox").TObject<{
        account: import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"personal">, import("@sinclair/typebox").TLiteral<"business">]>;
        }>;
        member: import("@sinclair/typebox").TObject<{
            role: import("@sinclair/typebox").TString;
            user_id: import("@sinclair/typebox").TString;
        }>;
        version: import("@sinclair/typebox").TInteger;
    }>;
    id: import("@sinclair/typebox").TString;
    source: import("@sinclair/typebox").TLiteral<"/domains/accounts">;
    specversion: import("@sinclair/typebox").TLiteral<"1.0">;
    time: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"accounts.account.opened.v1">;
}>;
/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountOpenedV1DataSchema
 * >} AccountOpenedV1Data
 */
/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountOpenedV1EventSchema
 * >} AccountOpenedV1Event
 */
export const AccountOpenedV1EventCheck: import("@sinclair/typebox/compiler").TypeCheck<import("@sinclair/typebox").TObject<{
    datacontenttype: import("@sinclair/typebox").TLiteral<"application/json">;
    data: import("@sinclair/typebox").TObject<{
        account: import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"personal">, import("@sinclair/typebox").TLiteral<"business">]>;
        }>;
        member: import("@sinclair/typebox").TObject<{
            role: import("@sinclair/typebox").TString;
            user_id: import("@sinclair/typebox").TString;
        }>;
        version: import("@sinclair/typebox").TInteger;
    }>;
    id: import("@sinclair/typebox").TString;
    source: import("@sinclair/typebox").TLiteral<"/domains/accounts">;
    specversion: import("@sinclair/typebox").TLiteral<"1.0">;
    time: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"accounts.account.opened.v1">;
}>>;
export type AccountOpenedV1Data = import("@sinclair/typebox").Static<typeof AccountOpenedV1DataSchema>;
export type AccountOpenedV1Event = import("@sinclair/typebox").Static<typeof AccountOpenedV1EventSchema>;
