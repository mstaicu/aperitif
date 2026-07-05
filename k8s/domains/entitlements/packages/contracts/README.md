# Entitlements Contracts

Public event contracts emitted by the entitlements domain.

| Subject | Version | Schema | Example |
| --- | ---: | --- | --- |
| `entitlements.account_entitlements.updated` | 1 | `src/events/entitlements.account_entitlements.updated.v1.mjs` | `examples/entitlements.account_entitlements.updated.v1.json` |

`schema_version` is the event shape version. `version` is the entitlement
snapshot state version used by consumers to ignore stale messages.
