# Personal notes

The idea of entitlements is there just so product features are unlocked for the container that owns them, which in this case is the account. And we went with an account for both personal and business so that we capture future requirements like invites or members. This is the entire rationale. Otherwise we could have just went with users and resources belonging to users.

The minimum input to compliance is this: "Can this user, in this account, unlock or use this thing?"

We pass it the userId, entitlementId and the accountId to check if the regulated product feature is available for this context, and if not, if it can be obtained and how

Domain modeling:
  actor
  boundary
  resource
  action
  state
  ownership
  policy

Policy modeling inside it:
  law/regulation/contract/risk
  company policy
  procedure
  checks
  decision
  entitlement/restriction/review

Fintech
  actor: account owner
  boundary: account
  resource: transfer
  action: initiate transfer
  policy: AML/KYC
  effect: transfers.enabled / manual review / blocked

Biotech
  actor: researcher
  boundary: lab/study account
  resource: clinical dataset
  action: export
  policy: consent/protocol/data protection
  effect: clinical_export.enabled / audit required / blocked

Cloud
  actor: engineer
  boundary: org/project
  resource: GPU workload
  action: launch
  policy: payment/quota/abuse/export-control risk
  effect: gpu.enabled / gpu.limit / review

Private markets
  actor: investor/advisor
  boundary: investor account/fund account
  resource: subscription order
  action: subscribe
  policy: suitability/accreditation/AML/jurisdiction
  effect: subscriptions.enabled / restricted / review

Bike shop
  actor: mechanic
  boundary: shop account
  resource: repair job
  action: mark complete
  policy: role/training/warranty rules
  effect: repair.complete.allowed / review required

# AI redacted

(core) identity -> owns users, passkeys, sessions, and operator identity.

(core) accounts -> owns account boundaries and membership topology. Product
resources are scoped to accounts, but owned by product domains.

(core) entitlements -> owns account-level unlocks and limits. Operators,
payments, compliance, onboarding, or product domains can grant/revoke
entitlement contributions; entitlements computes the effective account snapshot.

Core vocabulary:

user -> login actor.
party/subject -> real-world individual, business, or account context being evaluated.
account -> product/resource/commercial boundary.
account_member -> user can act inside account.
entitlement -> account can use a product capability.
resource -> thing owned/scoped by account, created by a user.

Core rule:

resources belong to accounts.
users act through account membership.
checks/proofs attach to evaluated subjects.
entitlements attach to accounts.
product domains decide which actions require which entitlements and permissions.

Example flow:

1. A user opens an account for a personal or business context.
2. The account establishes where resources live and who can act there.
3. Compliance checks an individual, business, or account context.
4. Compliance stores proofs and applies product/risk policy.
5. Compliance grants/revokes entitlement contributions when product behavior should unlock.
6. Entitlements emits the effective account entitlement snapshot.
7. Product domains project that snapshot and gate specific actions.

Example domains:

identity -> authenticates users and issues internal sessions/tokens.
accounts -> opens accounts and records account membership.
entitlements -> reduces grants into effective account capabilities.
documents -> owns documents scoped to account_id.
payments -> owns subscriptions/invoices/provider webhooks and grants paid entitlements.
compliance -> owns checks/proofs/policy for individuals, businesses, and account contexts.
onboarding -> owns step/state UX for collecting required data.
audit -> owns immutable records of who did what, where, why, and with what outcome.
