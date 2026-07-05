# Accounts Contracts

Public event contracts emitted by the accounts domain.

| Subject | Version | Schema | Example |
| --- | ---: | --- | --- |
| `accounts.account.opened` | 1 | `src/events/accounts.account.opened.v1.mjs` | `examples/accounts.account.opened.v1.json` |

`schema_version` is the event shape version. `version` is the account state
version used by consumers to ignore stale messages.
