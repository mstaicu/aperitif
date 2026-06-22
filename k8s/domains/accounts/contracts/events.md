# Accounts Events

Accounts publishes current-state facts. Consumers project by natural key and
apply events only when the incoming `version` is greater than or equal to the
stored projection version.

## `accounts.account.opened`

Schema version: `1`

Emitted when:

- an account is opened with its initial member member

Future member lifecycle flows should add separate member events.

Envelope:

```json
{
  "id": "uuid",
  "subject": "accounts.account.opened",
  "schema_version": 1,
  "version": 1,
  "payload": {}
}
```

Payload:

```json
{
  "account": {
    "id": "uuid"
  },
  "member": {
    "user_id": "uuid",
    "role": "owner"
  }
}
```

Semantics:

- This is a full snapshot for a newly opened account and its initial member.
- `version` is the account version after the change.
- Consumers should ack stale events where `version` is older than local state.

Known consumers:

- `entitlements`
- `documents`
