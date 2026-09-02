# Automated farm

Status: Illustrative. No Farm implementation exists.

Farm is one Product domain for organization-owned fields, vehicles, missions,
and observations. It uses Auth for humans, Accounts for ownership, and—only when
implemented—Machines plus Account machine membership for non-human actors.

Farm owns fields, vehicles, missions, observations, assignments, and all
product permissions. A machine is the authenticated actor; a vehicle is a Farm
resource. NATS stays inside platform workloads: machines call the Farm API.

```text
POST  /v1/accounts/{account_id}/fields
POST  /v1/accounts/{account_id}/vehicles
POST  /v1/accounts/{account_id}/missions
GET   /v1/accounts/{account_id}/missions?status=assigned
PATCH /v1/accounts/{account_id}/missions/{mission_id}
POST  /v1/accounts/{account_id}/missions/{mission_id}/observations
```

Derive the machine ID from the access token; never accept an arbitrary machine
ID. A machine may act only on its assigned mission. Use `If-Match` for mission
changes and an `Idempotency-Key` for retried observation uploads. Store media in
object storage; Farm stores metadata and relationships.

Build only after Machines and Account machine membership exist. Do not add remote
vehicle control, physical safety, compliance, payments, plan gates, or
product-specific human roles without a product requirement.
