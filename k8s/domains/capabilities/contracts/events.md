# Capabilities Events

Capabilities publishes current-state facts. Consumers project by natural key and
apply events only when the incoming `version` is greater than or equal to the
stored projection version.

## `capabilities.tenant_capabilities.updated`

Schema version: `1`

Emitted when:

- tenant capability grants are added
- tenant capability grants are revoked
- effective tenant capabilities are recalculated

Envelope:

```json
{
  "id": "uuid",
  "subject": "capabilities.tenant_capabilities.updated",
  "schema_version": 1,
  "version": 1,
  "payload": {}
}
```

Payload:

```json
{
  "tenant": {
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

- This is the full effective capability snapshot for one tenant.
- Consumers replace their projected capability map with this snapshot.
- `version` is the tenant capability snapshot version after recalculation.
- Consumers should ack stale events where `version` is older than local state.

Known consumers:

- `documents`
