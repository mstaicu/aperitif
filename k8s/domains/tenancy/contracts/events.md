# Tenancy Events

Tenancy publishes current-state facts. Consumers project by natural key and
apply events only when the incoming `version` is greater than or equal to the
stored projection version.

## `tenancy.tenant_member.updated`

Schema version: `1`

Emitted when:

- a tenant is created
- a tenant member is added
- a tenant member is removed
- a tenant member role changes

Envelope:

```json
{
  "id": "uuid",
  "subject": "tenancy.tenant_member.updated",
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
  "member": {
    "tenant_id": "uuid",
    "user_id": "uuid",
    "role_id": "owner",
    "active": true
  },
  "permissions": [
    {
      "id": "documents.read",
      "value": true
    }
  ]
}
```

Semantics:

- This is a full snapshot for one tenant member.
- `active: false` means the member is no longer active in that tenant.
- `role_id` is `null` when `active` is `false`.
- `permissions` is the full current permission set for that member.
- `version` is the tenant version after the change.
- Consumers should ack stale events where `version` is older than local state.

Known consumers:

- `capabilities`
- `documents`
