# Automated farm

Status: Illustrative — no Farm implementation exists.

## Outcome

Build one Farm product domain for an organization that operates fields,
vehicles, missions, and observations. The cloud assigns and records work; an
onboard controller remains responsible for physical control and safety.

## Assembles

| Kind       | Building block                                                              | Used for                                    | Status      |
| ---------- | --------------------------------------------------------------------------- | ------------------------------------------- | ----------- |
| Domain     | [Auth](../../domains/auth/README.md)                                        | Human authentication                        | Implemented |
| Domain     | [Accounts](../../domains/accounts/README.md)                                | Organization ownership and human membership | Implemented |
| Capability | [Machines](../capabilities/machines.md)                                     | Machine principal and credential exchange   | Proposed    |
| Capability | [Account machine membership](../capabilities/account-machine-membership.md) | Machine Account context                     | Proposed    |

This first product does not require plans, compliance, payments, operators, or
personal access tokens.

## Product domain

Farm owns:

```text
farm
├── fields
├── vehicles
├── missions
└── observations
```

Farm follows the [platform event contract](../../README.md#event-processing).
It publishes a complete current-resource feed only when another domain needs
that resource's current state. It publishes an append-only fact only when a
consumer needs the historical occurrence.

A machine is the authenticated actor. A vehicle is a Farm resource. They may
be linked, but are not the same record. Farm decides whether the machine may
act on a mission.

A human request requires membership in the account. A machine request requires
machine membership in the account. Farm owns every further product permission,
assignment, and resource rule.

```text
POST  /v1/accounts/{account_id}/fields
POST  /v1/accounts/{account_id}/vehicles
POST  /v1/accounts/{account_id}/missions
GET   /v1/accounts/{account_id}/missions?status=assigned
PATCH /v1/accounts/{account_id}/missions/{mission_id}
POST  /v1/accounts/{account_id}/missions/{mission_id}/observations
```

For a machine request, derive its identity from the access token's sub; do not
accept an arbitrary machine ID in the request.

A machine may read or change only a mission currently assigned to that machine.
Account membership alone is not enough. `PATCH` uses the mission's current
ETag in `If-Match`; Farm returns `412 Precondition Failed` for a stale mission
revision. Observation creation uses an `Idempotency-Key`, so a retried upload
returns the first result instead of creating a duplicate observation.

```text
farm.field.created.v1        # historical fact, if needed
farm.vehicle.created.v1      # historical fact, if needed
farm.mission.created.v1      # historical fact, if needed
farm.mission.updated.v1      # historical fact, if needed
farm.observation.created.v1  # historical fact, if needed
```

Store image and video bytes in object storage. Farm stores their metadata,
ownership, and mission relationship.

## Workflow

1. A human creates an organization account.
2. The owner creates a machine and credential, then adds it to the account.
3. The owner registers a field, vehicle, and mission in Farm.
4. Farm assigns the mission to the machine.
5. The machine exchanges its credential for a short-lived access token and
   polls its assigned missions.
6. Its onboard controller performs the physical work.
7. The machine uploads media through temporary object-storage URLs and reports
   observation metadata and mission progress to Farm.

NATS is internal to platform components; the machine calls the Farm API.

## Build

1. Implement [Machines](../capabilities/machines.md).
2. Implement [Account machine membership](../capabilities/account-machine-membership.md).
3. Build Farm with fields, vehicles, missions, and observations.
4. Prove the workflow with a simulated machine and duplicate/retried requests.
5. Add object storage and hardware integration.

## Not included

- Remote vehicle control, flight control, collision avoidance, or physical
  failsafes.
- Compliance, payments, plan gates, fleet scheduling, or product-specific
  human roles.
