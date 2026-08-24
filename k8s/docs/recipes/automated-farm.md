# Automated farm

Status: Recipe

## Outcome

Build one Farm product domain for an organization that operates fields,
vehicles, missions, and observations. The cloud assigns and records work; an
onboard controller remains responsible for physical control and safety.

## Required platform features

| Need                                                 | Platform source                                         | Status      |
| ---------------------------------------------------- | ------------------------------------------------------- | ----------- |
| Human authentication                                 | [Auth](../../domains/auth/README.md)                    | Implemented |
| Organization ownership and human membership          | [Accounts](../../domains/accounts/README.md)            | Implemented |
| Machine identity, credential, and account membership | [Machine identities](../features/machine-identities.md) | Proposed    |
| Versioned internal events                            | [Event contract](../../README.md#event-processing)      | Implemented |

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

A machine identity is the authenticated actor. A vehicle is a Farm resource.
They may be linked, but are not the same record. Farm decides whether the
machine may act on a mission.

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

```text
farm.field.created.v1
farm.vehicle.created.v1
farm.mission.created.v1
farm.mission.updated.v1
farm.observation.created.v1
```

Store image and video bytes in object storage. Farm stores their metadata,
ownership, and mission relationship.

## Workflow

1. A human creates an organization account.
2. The owner creates a machine identity and credential, then adds it to the
   account.
3. The owner registers a field, vehicle, and mission in Farm.
4. Farm assigns the mission to the machine.
5. The machine exchanges its credential for a short-lived access token and
   polls its assigned missions.
6. Its onboard controller performs the physical work.
7. The machine uploads media through temporary object-storage URLs and reports
   observation metadata and mission progress to Farm.

NATS is internal to platform components; the machine calls the Farm API.

## Build

1. Implement [machine identities](../features/machine-identities.md).
2. Build Farm with fields, vehicles, missions, and observations.
3. Prove the workflow with a simulated machine and duplicate/retried requests.
4. Add object storage and hardware integration.

## Not included

- Remote vehicle control, flight control, collision avoidance, or physical
  failsafes.
- Compliance, payments, plan gates, fleet scheduling, or product-specific
  human roles.
