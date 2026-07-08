/**
 * @param {Omit<AccountEntitlementsUpdatedV1Data, "version">} data
 * @param {number} version
 * @returns {AccountEntitlementsUpdatedV1Event}
 */
export function buildAccountEntitlementsUpdatedV1Event(data: Omit<AccountEntitlementsUpdatedV1Data, "version">, version: number): AccountEntitlementsUpdatedV1Event;
export const AccountEntitlementsUpdatedV1Source: "/domains/entitlements";
export const AccountEntitlementsUpdatedV1Type: "entitlements.account_entitlements.updated.v1";
export const AccountEntitlementsUpdatedV1DataSchema: import("@sinclair/typebox").TObject<{
    account: import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
    }>;
    entitlements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        value: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNumber]>;
    }>>;
    version: import("@sinclair/typebox").TInteger;
}>;
export const AccountEntitlementsUpdatedV1EventSchema: import("@sinclair/typebox").TObject<{
    datacontenttype: import("@sinclair/typebox").TLiteral<"application/json">;
    data: import("@sinclair/typebox").TObject<{
        account: import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
        }>;
        entitlements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            value: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNumber]>;
        }>>;
        version: import("@sinclair/typebox").TInteger;
    }>;
    id: import("@sinclair/typebox").TString;
    source: import("@sinclair/typebox").TLiteral<"/domains/entitlements">;
    specversion: import("@sinclair/typebox").TLiteral<"1.0">;
    time: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"entitlements.account_entitlements.updated.v1">;
}>;
/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountEntitlementsUpdatedV1DataSchema
 * >} AccountEntitlementsUpdatedV1Data
 */
/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountEntitlementsUpdatedV1EventSchema
 * >} AccountEntitlementsUpdatedV1Event
 */
export const AccountEntitlementsUpdatedV1EventCheck: import("@sinclair/typebox/compiler").TypeCheck<import("@sinclair/typebox").TObject<{
    datacontenttype: import("@sinclair/typebox").TLiteral<"application/json">;
    data: import("@sinclair/typebox").TObject<{
        account: import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
        }>;
        entitlements: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            id: import("@sinclair/typebox").TString;
            value: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNumber]>;
        }>>;
        version: import("@sinclair/typebox").TInteger;
    }>;
    id: import("@sinclair/typebox").TString;
    source: import("@sinclair/typebox").TLiteral<"/domains/entitlements">;
    specversion: import("@sinclair/typebox").TLiteral<"1.0">;
    time: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"entitlements.account_entitlements.updated.v1">;
}>>;
export type AccountEntitlementsUpdatedV1Data = import("@sinclair/typebox").Static<typeof AccountEntitlementsUpdatedV1DataSchema>;
export type AccountEntitlementsUpdatedV1Event = import("@sinclair/typebox").Static<typeof AccountEntitlementsUpdatedV1EventSchema>;
