# Capabilities Events

Capabilities publishes current-state facts. Consumers project by natural key and
apply events only when the incoming `version` is greater than or equal to the
stored projection version.

## `capabilities.account_capabilities.updated`

Schema version: `1`

Emitted when:

- account capability grants are added
- account capability grants are revoked
- effective account capabilities are recalculated

Envelope:

```json
{
  "id": "uuid",
  "subject": "capabilities.account_capabilities.updated",
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
  "capabilities": [
    {
      "id": "documents.enabled",
      "value": true
    }
  ]
}
```

Semantics:

- This is the full effective capability snapshot for one account.
- Consumers replace their projected capability map with this snapshot.
- `version` is the account capability snapshot version after recalculation.
- Consumers should ack stale events where `version` is older than local state.

Known consumers:

- `documents`
