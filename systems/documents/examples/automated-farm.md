# Automated farm

Status: Illustrative. No Farm implementation exists.

Farm is one Product domain for organization-owned fields, vehicles, missions,
and observations. It uses Identity for humans and account ownership, and—only
when implemented—Identity Machines plus Identity machine membership for
non-human actors.

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

Build only after Machines and Identity machine membership exist. Do not add remote
vehicle control, physical safety, compliance, payments, plan gates, or
product-specific human roles without a product requirement.

## UAV example

1. The farm owner registers a machine for a survey UAV, provisions its credential, and attaches the machine to the farm's account. [Machine credentials](../../identity/documents/machines.md) · [Account membership](../../identity/documents/machine-membership.md)
2. Farm records the vehicle and assigns a field-survey mission to that machine.
3. The UAV exchanges its credential at Identity's proposed `POST /oauth/token` using the OAuth 2.0 `client_credentials` grant. It presents the resulting access token to the Farm API.
4. Farm uses the verified token's `sub` to check account membership and the mission assignment. The UAV can upload observations for its assigned mission. Farm denies an upload for another machine's mission, even within the same account.
