# Accounts Contracts

Public event contracts emitted by the accounts domain.

| CloudEvents type | Schema | Example |
| --- | --- | --- |
| `accounts.account.opened.v1` | `src/events/accounts.account.opened.v1.mjs` | `examples/events/accounts.account.opened.v1.json` |

Events use the CloudEvents JSON shape:

- `specversion` is `1.0`.
- `source` identifies the producing domain.
- `type` is the versioned event name.
- `data` contains the domain fact.
- `data.version` is the account state version used by consumers to ignore stale messages.
- `data.account.type` is `personal` or `business`.

Producers should use the exported `buildAccountOpenedV1Event` helper so the
published event matches the contract.

Potential future tooling:

- `cloudevents` can help create and parse CloudEvents if runtime bindings become useful.
- AsyncAPI is the future event catalog/docs layer. Add it when event discovery, generated docs, or event API diffing becomes useful. TypeBox remains the active schema source.
