# Entitlements Events

Entitlements publishes current-state facts. Consumers project by natural key and
apply events only when the incoming `version` is greater than or equal to the
stored projection version.

## `entitlements.account_entitlements.updated`

Schema version: `1`

Emitted when:

- account entitlement grants are added
- account entitlement grants are revoked
- effective account entitlements are recalculated

Envelope:

```json
{
  "id": "uuid",
  "subject": "entitlements.account_entitlements.updated",
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
  "entitlements": [
    {
      "id": "documents.enabled",
      "value": true
    }
  ]
}
```

Semantics:

- This is the full effective entitlement snapshot for one account.
- Consumers replace their projected entitlement map with this snapshot.
- `version` is the account entitlement snapshot version after recalculation.
- Consumers should ack stale events where `version` is older than local state.

Known consumers:

- `documents`
