# Entitlements Contracts

Public event contracts emitted by the entitlements domain.

| CloudEvents type | Schema | Example |
| --- | --- | --- |
| `entitlements.account_entitlements.updated.v1` | `src/events/entitlements.account_entitlements.updated.v1.mjs` | `examples/entitlements.account_entitlements.updated.v1.json` |

Events use the CloudEvents JSON shape:

- `specversion` is `1.0`.
- `source` identifies the producing domain.
- `type` is the versioned event name.
- `data` contains the domain fact.
- `data.version` is the entitlement snapshot state version used by consumers to ignore stale messages.

Potential future tooling:

- `cloudevents` can help create and parse CloudEvents if runtime bindings become useful.
- AsyncAPI is the future event catalog/docs layer. Add it when event discovery, generated docs, or event API diffing becomes useful. TypeBox remains the active schema source.
