SAAS PLATFORM FOUNDATION (BARE MINIMUM)

Core idea

Identity is global.
Authority is derived from other domains.
Auth is the gateway that issues tokens based on projected authority.

A user is ready to use the platform when:

- identity exists
- required authority exists
- auth has projected that authority
- token minted contains that authority

Domains communicate through NATS events.

System is composed of independent SCS domains:

auth-api / auth-ui / auth-worker  
profile-api / profile-ui / profile-worker (optional)  
tenant-api / tenant-ui / tenant-worker (optional)  
payments-api / payments-ui / payments-worker (optional)

---

AUTH DOMAIN (ALWAYS EXISTS)

Owns:

- signup / login
- credentials
- sessions
- authority projection
- token minting
- onboarding routing

Minimal tables

users

- id

sessions

- id
- user_id

authority_requirements (platform config)

- require_profile
- require_tenant
- require_plan

auth_global_access

- user_id
- platform_roles[]

auth_tenant_access

- user_id
- tenant_id
- roles[]

auth_entitlements (optional)

- subject_id (user or tenant)
- plan

Auth subscribes to events from other domains.
Auth-ui redirects user to onboarding domains when authority is missing.

---

PROFILE DOMAIN (OPTIONAL)

Purpose  
Grant global operational capability.

Used for  
operators, drivers, partners, moderators, etc.

Minimal table

profiles

- user_id
- type
- status (pending / active / suspended)

Events

profile.activated  
profile.revoked

Auth reaction

profile.activated  
→ add platform role in auth_global_access

profile.revoked  
→ remove role

User becomes ready when profile is active and projected.

---

TENANT DOMAIN (OPTIONAL)

Purpose  
Create governance boundary and scoped roles.

Used for  
workspaces, organizations, merchant accounts.

Minimal tables

tenants

- id

memberships

- tenant_id
- user_id
- role
- status

Events

membership.granted  
membership.revoked

Auth reaction

membership.granted  
→ update auth_tenant_access

membership.revoked  
→ remove tenant authority

User becomes ready when membership exists and is projected.

---

PAYMENTS DOMAIN (OPTIONAL)

Purpose  
Control commercial access.

Minimal tables

subscriptions

- subject_id (user or tenant)
- plan
- status

Events

subscription.started  
subscription.cancelled

Auth reaction

subscription.started  
→ update auth_entitlements

subscription.cancelled  
→ remove entitlement

User becomes ready when required plan exists.

---

AUTH ROUTING LOGIC AFTER LOGIN

Auth checks projections vs platform requirements.

If require_profile and no platform role  
→ redirect profile-ui

If require_tenant and no membership  
→ redirect tenant-ui

If require_plan and no entitlement  
→ redirect payments-ui

If all satisfied  
→ mint token  
→ user enters platform

---

RBAC FOUNDATION

Roles originate in domains:

Profile domain → global roles  
Tenant domain → tenant roles

Auth stores projected RBAC:

auth_global_access  
auth_tenant_access

Tokens contain roles.
APIs enforce roles.

---

ABAC FOUNDATION

Attributes originate in domains:

profile attributes  
tenant settings  
subscription tier  
resource ownership

Auth may include simple attributes in token.

Final ABAC decision happens inside APIs.

---

FINAL MINIMAL MODEL

Auth = identity + projection + token gateway

Optional authority sources:

- Profile (global capability)
- Tenant (scoped governance)
- Payments (commercial entitlement)

Domains emit events → auth projects authority → tokens minted → user becomes operational.

---

PROFILE vs TENANT PRECEDENCE (FOUNDATION RULE)

A profile should take precedence in onboarding ONLY when:

the platform requires a user to be globally eligible
before they can meaningfully operate inside any tenant.

Otherwise tenant membership should come first.

There are 3 dominant SaaS shapes.

---

1. ACTOR-FIRST PLATFORM (Profile First)

Pattern

user signup
→ capability onboarding (profile)
→ tenant / organization interaction (optional or later)

Used when:

- platform has global operators
- eligibility / verification is heavy
- user can act outside any tenant
- tenant is secondary coordination layer

Examples of this shape

- delivery drivers
- marketplace sellers
- gig workers
- compliance-bound operators
- regulated actors

Why profile comes first

Because:

without capability the user cannot do anything useful,
even if they belong to a tenant.

Tenant membership does not grant eligibility.

Authority axis = capability.

Recommended onboarding order

signup → profile-ui → tenant-ui (optional)

---

2. ORGANIZATION-FIRST SAAS (Tenant First)

Pattern

user signup
→ join or create tenant
→ platform usage begins immediately

Used when:

- product is collaborative
- value exists inside workspace
- eligibility is not complex
- user identity alone is sufficient

Examples

- Slack
- Notion
- GitHub orgs
- CRM systems
- internal admin tools

Why tenant comes first

Because:

without tenant context the user has no resources,
no collaboration surface,
no meaningful actions.

Profile adds little or no value.

Authority axis = governance.

Recommended onboarding order

signup → tenant-ui

(profile usually does not exist)

---

3. HYBRID ECOSYSTEM PLATFORM (Conditional Order)

Pattern

user signup
→ determine intent
→ route to profile OR tenant

Used when:

- both global actors and organization staff exist
- platform supports multiple journeys
- eligibility varies by role

Examples

- delivery platform with merchants + drivers
- SaaS with field operators + org admins
- marketplaces with buyers, sellers, vendors

Why order is conditional

Because:

some users must be eligible first  
others must belong to an organization first

Authority axis = dual.

Recommended onboarding model

signup → onboarding router

router decides:

- operator journey → profile-ui first
- org admin journey → tenant-ui first
- both required → sequence both

---

FOUNDATIONAL INSIGHT

Profile is NOT inherently “more important” than tenant.

It is only more important when:

platform capability is the bottleneck to value.

Tenant is more important when:

organizational context is the bottleneck to value.

---

VERY PRACTICAL RULE YOU CAN USE

Ask:

“What is the FIRST thing a new user must have
before they can perform a meaningful action?”

If the answer is:

- “they must be verified / approved / licensed”
  → profile first

- “they must belong to a workspace / org”
  → tenant first

- “depends on what they are trying to do”
  → hybrid router

---

CAN YOU MODEL MOST PLATFORMS AS:

signup → profile → tenant ?

No.

You can model most _ecosystem / operator_ platforms like this.

But most classic SaaS collaboration tools are:

signup → tenant.

So the safest universal foundation is:

signup → authority router → correct domain UI

Not a hardcoded profile-first pipeline.

---

BEST FOUNDATIONAL DEFAULT

Do NOT encode:

signup → profile → tenant

Encode:

signup → determine missing authority → redirect

Where missing authority may be:

- capability
- governance
- commercial entitlement

This keeps the platform product-agnostic and future-proof.

---

WHERE ABAC IS DONE (FOUNDATION)

RBAC answer:
"Does this user have the required role?"

ABAC answer:
"Is this user allowed to do THIS action on THIS resource in THIS context?"

ABAC is therefore evaluated:

at request time
in the domain that owns the resource.

---

WHY ABAC CANNOT LIVE PURELY IN AUTH

Auth knows:

- identity
- projected roles
- maybe coarse attributes

Auth does NOT know:

- who owns a delivery
- which tenant owns a document
- subscription limits
- feature flags
- regional constraints
- resource lifecycle state

Those belong to domain services.

Therefore ABAC must be enforced where those facts exist.

---

COMMON PLACES ABAC IS ENFORCED

1. Route handler (simple systems)

Example

GET /tenants/{tid}/documents/{docId}

Handler checks:

- token.tenant_id == tid
- document.tenant_id == tid
- document.owner_id == user_id

Allow or deny.

This is ABAC.

---

2. Service / domain layer (better)

Route handler calls:

DocumentService.canEdit(user, document)

Service evaluates:

- role
- ownership
- state
- plan
- region
- feature flags

Cleaner separation.

---

3. Policy engine / middleware (advanced)

Some systems use:

OPA
Cedar
custom policy service

Handler sends context:

user roles  
attributes  
resource attributes

Policy returns allow / deny.

---

WHAT AUTH MAY STILL DO FOR ABAC

Auth may mint lightweight attributes into tokens:

region  
plan  
profile_status  
tenant_tier

This reduces extra lookups.

But final ABAC decision still happens:

inside the API domain.

---

VERY IMPORTANT DISTINCTION

RBAC location

Derived in domains  
Projected into auth  
Minted into token  
Checked quickly at API boundary

ABAC location

Resource facts live in domains  
Context evaluated at request time  
Decision made near resource

---

SIMPLE RULE YOU CAN REMEMBER

Auth decides:

"Who are you and what roles do you broadly have?"

APIs decide:

"Are you allowed to do THIS right now?"

That second question is ABAC.

---

RBAC FLOW (CLEAN FOUNDATION)

1. Roles originate in domains

Profile domain
→ driver activated
→ role = driver

Tenant domain
→ membership granted
→ role = admin

These are facts about authority.

---

2. Auth projects roles

Auth-worker consumes NATS events.

Updates projections:

auth_global_access
auth_tenant_access

This is the RBAC read model.

---

3. Auth mints tokens from projections

Access token contains:

sub = user id
roles / platform_roles
tenant_roles (optional)
tenant_id (optional)
scope (optional)

These roles represent coarse permissions.

---

4. Edge (Traefik / gateway) may check RBAC

Ingress middleware can check:

- token valid
- required role present
- required scope present
- tenant id present

This is GOOD for:

- blocking obviously invalid requests
- protecting internal services
- reducing load
- enforcing service-level access

Example:

driver-api route
→ require role=driver

admin-api route
→ require role=admin

---

5. Service still enforces authorization

Ingress RBAC is NOT sufficient.

Service must still check:

- ownership
- state
- feature entitlement
- resource tenant match

This is ABAC.

Ingress = coarse gate  
Service = real authority

---

IMPORTANT: ROLES vs SCOPES vs AUD

Roles

Business authority labels.

driver  
admin  
support

Scopes

API permission grouping.

deliveries:read  
deliveries:write  
memberships:manage

Scopes may be derived from roles,
but they are NOT the same thing.

Aud

Target service / audience.

driver-api  
tenant-api  
payments-api

Aud usually defines:

"Which service is this token meant for?"

Not:

"What role does user have?"

---

RECOMMENDED SIMPLE TOKEN MODEL

{
sub
tenant_id (optional)
roles
scope
aud
}

Example

driver token

roles = ['driver']
scope = ['deliveries:*']
aud = 'driver-api'

tenant admin token

roles = ['admin']
scope = ['memberships:*']
aud = 'tenant-api'

---

VERY IMPORTANT DESIGN RULE

Ingress should answer:

"Should this request even reach this service?"

Service should answer:

"Is this specific action allowed?"

RBAC at ingress  
RBAC + ABAC inside service

---

BEST PRACTICE SUMMARY

RBAC lifecycle

domain lifecycle → event  
→ auth projection → token roles  
→ ingress coarse check  
→ service final decision

If you follow this,
you get:

- decoupled authority
- fast rejection at edge
- correct domain enforcement
- scalable SaaS foundation

---

SHOULD INGRESS PERMISSIONS DEFINE AUTH PROJECTIONS?

No.

Ingress permissions are a DELIVERY / EDGE concern.
Auth projections are an AUTHORITY MODEL concern.

Projections must represent:

"Why is this user allowed to act?"

NOT

"Which API route should allow them?"

---

CORRECT FOUNDATION

Auth projection tables should model:

- platform capability roles
- tenant governance roles
- commercial entitlements (optional)

Example projections

auth_global_access

- user_id
- platform_roles[]

auth_tenant_access

- user_id
- tenant_id
- roles[]

auth_entitlements

- subject_id
- plan
- features[]

These reflect BUSINESS AUTHORITY.

---

INGRESS PERMISSIONS ARE THEN DERIVED

From those roles you define:

driver-api requires role=driver  
tenant-api requires role=admin  
billing-api requires feature=billing_access

Ingress rules are just policy mapping.

They should NOT define how authority is stored.

---

WHY THIS MATTERS

If you model projections around ingress:

You get:

"User has permission to call driver-api"

But you lose:

"User is an active driver"
"User belongs to tenant T1"
"User has pro subscription"

These are stable authority facts.

Ingress routes change.
Services split.
APIs version.

Authority should NOT depend on that.

---

CORRECT MENTAL MODEL

Domains emit authority facts.

Auth stores authority facts (projected).

Tokens carry authority facts (roles / attributes).

Ingress checks simple conditions based on those facts.

Services enforce deeper logic.

---

GOOD DESIGN FLOW

Profile domain
→ emits driver activated

Auth projection
→ platform_roles = ['driver']

Ingress config
→ route driver-api requires role=driver

This is clean.

---

BAD DESIGN FLOW

Ingress needs role=driver
→ therefore auth stores permission driver-api-access

Now:

If you split driver-api into:

- driver-jobs-api
- driver-wallet-api

Your authority model breaks.

---

VERY PRACTICAL RULE

Model projections around:

WHO the user is in the system
WHAT authority they have in business terms

NOT

WHICH endpoint they can hit.

Endpoints are implementation details.
Authority is product semantics.

---

WHEN IT IS OK TO THINK ABOUT INGRESS

After authority model is stable.

Then you design:

- scopes
- audiences
- route guards
- gateway policies

These are delivery optimizations.

Not the source of truth.

---

FINAL SIMPLE ANSWER

You are correct that:

Ingress permissions should be easy to derive from auth projections.

But you are NOT correct that:

Ingress permission needs should define projection tables.

Projection tables must be based on domain authority.

Ingress must adapt to that.

---

AUD vs SCOPE (CLEAN SAAS FOUNDATION)

aud (audience)

Defines:

"Which backend service is allowed to accept this token?"

Examples

aud = inference-api  
aud = tenant-api  
aud = payments-api

Enforced typically at:

- ingress / gateway middleware
- API gateway
- service auth middleware

Purpose

- reduce blast radius
- prevent token reuse across domains
- enforce service boundary security

If aud mismatch → request rejected early.

---

scope

Defines:

"What operations are allowed inside that service?"

Examples

inference:run  
documents:write  
memberships:manage  
billing:update

Scopes are:

- finer-grained than aud
- often derived from roles
- checked inside the service or gateway policy layer

---

HOW THEY WORK TOGETHER

Access token example

aud = inference-api  
scope = inference:run

Meaning:

Token can reach inference-api  
But cannot perform admin or billing operations there.

---

WHERE RBAC FITS

Roles are business authority labels.

driver  
admin  
member

Roles are projected in auth
→ may be expanded into scopes at token mint time

Example

role = admin  
→ scope = memberships:\*

role = member  
→ scope = documents:read

---

WHERE ABAC FITS

Even with correct aud and scope:

Service must still check:

- tenant match
- resource ownership
- quota remaining
- feature flags
- document state

That is ABAC.

---

REAL REQUEST PATH

Client
→ sends token

Ingress

- verify signature
- verify aud matches route policy
- optionally verify scope present

Service

- verify role / scope
- verify tenant context
- evaluate ABAC

Then allow.

---

VERY PRACTICAL RULE

aud = service boundary guard  
scope = capability inside service  
role = authority source  
ABAC = contextual truth

All four layers cooperate.

---

REFRESH TOKEN + AUD DURING ONBOARDING (CORRECT MODEL)

You have:

- ONE refresh token (session continuity)
- MANY short-lived access tokens
- Each access token may target a specific audience (service)

But:

aud does NOT mean "next onboarding step".

aud means:

"Which backend service will accept this token?"

---

CORRECT TOKEN REFRESH SHAPE

POST /session/refresh

Body may include:

aud = "tenant-api"
tenant_id = "T1" (optional)
scopes = [...] (optional)

Auth responds with:

access token valid for that audience + current authority snapshot.

---

WHAT HAPPENS DURING ONBOARDING

Step 1 — After signup

Client calls:

/session/refresh  
aud = "tenant-api"

Token minted:

tenant_id = null  
roles = []

This token allows:

- calling tenant-api onboarding endpoints

NOT because tenant is “next step”
but because tenant-api is the service client needs to talk to.

---

Step 2 — After tenant created

Tenant domain emits event → auth projection updates.

Client calls refresh again:

aud = "payments-api"
tenant_id = T1

New token:

tenant_roles = ['owner']  
tenant_id = T1

Now client can safely call payments-api.

---

Step 3 — After subscription

Client refreshes again:

aud = "inference-api"

New token:

tenant_roles = ['owner']  
plan = premium

Now user can call product APIs.

---

VERY IMPORTANT DISTINCTION

Onboarding router logic

decides:

"Which domain UI should user go to?"

aud selection logic

decides:

"Which service should accept this token?"

These are different layers.

---

GOOD MENTAL MODEL

Refresh token = login continuity

Access token = scoped service capability snapshot

aud = target service

tenant_id = target authority context

roles = coarse permissions

attributes = entitlement / ABAC hints

---

DO YOU NEED MULTIPLE AUD TOKENS?

Not always.

Some platforms mint:

- one multi-audience token
- gateway validates route → forwards

Others mint:

- per-service audience tokens (more secure)

Both valid.

---

RECOMMENDED SIMPLE APPROACH FOR YOUR SAAS

During onboarding:

Client requests access token for the service it is about to call.

signup → need tenant  
→ refresh aud=tenant-api

tenant created → need billing  
→ refresh aud=payments-api

plan active → need product  
→ refresh aud=inference-api

This keeps tokens minimal and explicit.

---

FINAL FOUNDATION RULE

aud is about:

service boundary security.

Onboarding routing is about:

authority acquisition.

They intersect in flow,
but should never be conflated in design.

---

THREE AUTHORITY SHAPES (VERY SIMPLE)

1. PLATFORM (often called "single-tenant" authority)

Users act globally.

There is no workspace / organization boundary.

Authority comes from:

- platform roles
- capability profiles
- entitlements

Examples

- driver platforms
- moderation tools
- solo AI tools
- creator tools

User power comes from:

"the platform trusts this user to do X"

---

2. TENANT (multi-tenant SaaS)

Users act inside organizations / workspaces.

Authority comes from:

- tenant membership
- tenant roles
- tenant subscription

Examples

- Slack
- Notion
- CRM systems
- your legal AI SaaS

User power comes from:

"this user belongs to tenant T and has role R"

---

3. HYBRID (platform + tenant)

Both global authority and tenant authority exist.

Examples

- delivery platforms with merchants + drivers
- marketplaces with sellers + shops
- SaaS with field operators + workspace admins

User power comes from BOTH:

"the platform trusts this user globally"
AND
"this user has authority inside tenant T"

---

WHERE PROFILES FIT

Profiles are:

capability lifecycle aggregates.

They answer:

"Is this user eligible to act as X?"

Examples

driver profile  
legal reviewer profile  
verified partner profile

They are NOT tenants.
They are NOT identity.
They are NOT subscriptions.

They are:

platform-level eligibility.

---

HOW PROFILES WORK IN EACH SHAPE

PLATFORM shape

Profiles are often primary.

Example

signup → driver profile → ready

Because there is no tenant.

---

TENANT shape

Profiles often do not exist.

Example

signup → join workspace → ready

Because authority is governance-based.

But profiles can still exist optionally.

Example

workspace SaaS with certified users.

---

HYBRID shape

Profiles and tenants both matter.

Example

signup → driver profile  
signup → merchant workspace

Both give different authority dimensions.

---

VERY SIMPLE MENTAL MODEL

Identity = who are you

Tenant = where can you act

Role = what can you do

Profile = are you eligible to do this class of actions

Plan = how much can you consume

These combine to define user power.

---

FINAL SIMPLE ANSWER

Yes — most systems fall into:

- platform authority
- tenant authority
- hybrid authority

Profiles are not a separate type.

Profiles are one way to grant platform-level authority,
and are mainly important in platform or hybrid systems.

---

IS A PROFILE AN APPLICATION FORM?

Partially.

Better model:

Application form = how the profile is created  
Profile = the ongoing eligibility record

The profile lives after the form is submitted.

It continues to change state.

---

WHAT A PROFILE REALLY IS

A profile is:

a domain aggregate that tracks whether a user is eligible to act in a certain capacity.

Example

driver_profile
legal_reviewer_profile
verified_partner_profile

Typical states

- pending
- active
- suspended
- revoked

---

WHAT THE PROFILE PRODUCES

When profile becomes active:

It usually produces:

platform authority.

This is often represented as:

a role or capability label.

Example

driver_profile active  
→ role = driver

legal_reviewer_profile active  
→ role = reviewer

---

VERY IMPORTANT DISTINCTION

Profile is NOT the role.

Profile is the reason the role exists.

Role is the enforcement label.

Profile is business lifecycle.

Role is permission shorthand.

---

EXAMPLE FLOW

User submits application form  
→ profile created status=pending

Compliance approves  
→ profile status=active

Auth projection updates  
→ platform_roles += reviewer

Token minted  
→ user can now access reviewer APIs

---

WHY THIS MODEL IS GOOD

Because later:

profile can be suspended  
→ role removed

User does not need to "lose their account"
just lose eligibility.

This is extremely common in:

- marketplaces
- operator platforms
- regulated SaaS
- trust-tier systems

---

SIMPLE ONE-LINE MODEL

A profile is an eligibility lifecycle  
that may yield or revoke roles.

---

AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION

AUTHORITY MODELS — CONCRETE FOUNDATION

There are 3 authority shapes a system can implement.

- PLATFORM (global authority)
- TENANT (scoped authority)
- HYBRID (both)

Profiles are a SOURCE of platform authority.
Memberships are a SOURCE of tenant authority.
Plans are a SOURCE of commercial authority.

RBAC = role labels derived from authority sources  
ABAC = contextual checks done at request time

A refresh token (session) is long-lived.  
Access tokens are short-lived authority snapshots requested as the user progresses.

---

VENN DIAGRAMS

PLATFORM AUTHORITY

        +-------------------+
        |   PLATFORM        |
        |                   |
        |   Users act       |
        |   globally        |
        |                   |
        +-------------------+

Authority source = profiles / platform lifecycle

TENANT AUTHORITY

        +-------------------+
        |     TENANT        |
        |                   |
        | Users act only    |
        | inside workspace  |
        |                   |
        +-------------------+

Authority source = memberships / tenant roles

HYBRID AUTHORITY

         +---------+
         |Platform |
         |Authority|
         +----+----+
              |
      +-------+--------+
      |                |

+-----+----+ +-----+----+
| Tenant A | | Tenant B |
+----------+ +----------+

User may have:

- global authority
- tenant authority
- both

---

ASCII SYSTEM DIAGRAMS + ACCESS TOKEN REQUESTS

PLATFORM MODEL

User
-> Auth signup
-> receives refresh token

User requests access token

POST /session/refresh  
aud = profile-api

User
-> Profile Domain onboarding

Profile Domain
-> emits profile.activated

Auth Projection
-> platform_roles updated

User requests NEW access token

POST /session/refresh  
aud = platform-api

Token
-> roles = ['driver' or similar]

API
-> checks platform role

TENANT MODEL

User
-> Auth signup
-> receives refresh token

User requests access token

POST /session/refresh  
aud = tenant-api

User
-> Tenant Domain create/join workspace

Tenant Domain
-> emits membership.granted

Auth Projection
-> tenant_roles updated

User requests NEW access token

POST /session/refresh  
aud = product-api  
tenant_id = T1

Token
-> tenant_id + roles

API
-> checks tenant context + role

HYBRID MODEL

User
-> Auth signup
-> receives refresh token

Global capability path

User requests token

POST /session/refresh  
aud = profile-api

User
-> Profile onboarding

Profile Domain
-> emits profile.activated

Auth Projection
-> platform_roles updated

User requests token

POST /session/refresh  
aud = tenant-api

Tenant governance path

User
-> Tenant onboarding

Tenant Domain
-> emits membership.granted

Auth Projection
-> tenant_roles updated

User requests FINAL token

POST /session/refresh  
aud = product-api  
tenant_id = T1

Token
-> platform_roles
-> tenant_roles
-> tenant_id

API
-> checks whichever authority required

---

TABLE — WHAT EACH MODEL MUST IMPLEMENT

| Capability                 | Platform | Tenant   | Hybrid |
| -------------------------- | -------- | -------- | ------ |
| Identity (users / session) | YES      | YES      | YES    |
| Refresh token continuity   | YES      | YES      | YES    |
| Access token per boundary  | YES      | YES      | YES    |
| Auth projection            | YES      | YES      | YES    |
| Profiles domain            | OFTEN    | RARE     | YES    |
| Tenant domain              | NO       | YES      | YES    |
| Membership roles           | NO       | YES      | YES    |
| Platform roles             | YES      | OPTIONAL | YES    |
| Commercial plans           | OPTIONAL | OFTEN    | OFTEN  |
| Tenant context in token    | NO       | YES      | YES    |
| Global role in token       | YES      | OPTIONAL | YES    |

---

TABLE — AUTHORITY SOURCES

| Authority Source | Grants            | Typical Claim  |
| ---------------- | ----------------- | -------------- |
| Profile          | Eligibility       | platform role  |
| Membership       | Governance scope  | tenant role    |
| Plan             | Consumption power | plan / feature |
| Identity         | Authentication    | sub / sid      |

---

RBAC FIT

RBAC = role labels derived from projections.

Projection tables

auth_global_access

- user_id
- platform_roles[]

auth_tenant_access

- user_id
- tenant_id
- roles[]

Access token refreshes happen when projections change.

Token contains

roles
tenant_roles
scope (derived)

Ingress / API checks

- role present
- scope present

RBAC answers:

"Is this user broadly allowed to perform this class of actions?"

---

ABAC FIT

ABAC is NOT stored as simple role tables.

ABAC evaluated in API / domain.

Examples

- resource.owner_id == user_id
- tenant_id match
- quota_remaining > 0
- document.state == ACTIVE
- plan == premium
- feature flag enabled

ABAC answers:

"Is this specific action allowed right now?"

---

TOKEN SHAPES PER MODEL

PLATFORM

{
sub
roles
aud = platform-api
}

TENANT

{
sub
tenant_id
roles
aud = product-api
}

HYBRID

{
sub
tenant_id
platform_roles
tenant_roles
aud = product-api
}

---

READY STATE PER MODEL

Platform

- profile active → refresh token → request product access token

Tenant

- membership active → refresh token → request tenant-scoped access token

Hybrid

- required authority active → refresh token → request final product token

---

FINAL FOUNDATION

Platform model = global eligibility driven  
Tenant model = governance boundary driven  
Hybrid model = both

Refresh token = continuity  
Access tokens = evolving authority snapshots

RBAC = coarse authority labels from projections  
ABAC = contextual decision in APIs  
Tokens = constrained per security domain as user progresses

---

AUTHORITY MODELS, ROLES, AND ENFORCEMENT — UNIFIED SIMPLE FOUNDATION

1. WHAT SINGLE / MULTI / HYBRID REALLY ARE

Single / Multi / Hybrid are NOT architectures or standards.

They are:

authority models (or authority topologies)

They describe:

- where authority is scoped
- how users gain power in the system
- whether authority is global, tenant-scoped, or both

Three shapes:

PLATFORM (single authority)

- users act globally
- authority from profiles / platform roles / entitlements

TENANT (multi-tenant authority)

- users act inside workspaces
- authority from memberships / tenant roles / tenant plans

HYBRID

- users may have global eligibility AND tenant authority
- both authority sources exist

This is conceptual system design.
Architecture (microservices, NATS, monolith, etc.) implements it.

---

2. WHERE AUTHORITY ACTUALLY COMES FROM

Authority never comes from roles.

Authority comes from domain facts.

Examples

- membership granted in tenant T
- subscription premium active
- profile verified
- document owned by user
- tenant feature enabled

These are truth.

Roles are derived labels.

---

3. WHAT ROLES ARE

Roles are:

coarse summaries of authority facts
that make permission enforcement simple.

Examples

- owner
- admin
- member
- reviewer
- driver

Bad roles

- can_call_api_X
- button_permission_Y

Roles must reflect business capability,
not technical routes.

---

4. WHO DEFINES ROLES

You do.

Roles are product design.

You decide:

- what responsibilities exist
- what power boundaries exist
- what collaboration model exists

Domains then assign roles based on lifecycle:

membership lifecycle  
profile lifecycle  
admin actions  
automation rules

Plans usually grant entitlements,
not roles.

---

5. HOW ROLES FLOW THROUGH THE SYSTEM

Domain emits authority fact  
→ auth projects role  
→ token minted with role  
→ ingress may check role  
→ service enforces final permission

Example

membership role=admin  
→ auth projection tenant_roles=['admin']  
→ token includes tenant_roles  
→ API checks role

---

6. RBAC VS ABAC

RBAC

- derived from roles
- coarse permission gating
- fast enforcement

Answers:

"Can this user generally perform this type of action?"

ABAC

- evaluated in product domains
- uses real context

Examples

- tenant match
- ownership
- quota remaining
- feature flags
- lifecycle state

Answers:

"Can this user perform THIS action right now?"

---

7. TOKEN PURPOSE

Access tokens are:

authority snapshots.

They contain:

- roles
- tenant context
- scopes (derived)
- audience (target service)

They constrain what the system will accept.

They do NOT guide user journeys.

UI / product logic guides user behaviour.

---

8. FINAL MENTAL MODEL

Authority facts = real truth  
Roles = shorthand authority labels  
Tokens = authority snapshot  
Ingress = coarse gate  
Service = real decision

Single / Multi / Hybrid define:

where authority is scoped.

Roles define:

how authority is expressed.

ABAC defines:

how authority is finally enforced.

---

AUTHORITY DESIGN IS DOMAIN MODELLING

You are not designing roles first.

You are designing:

- the truths of your system
- the lifecycle of power
- how users gain and lose capability

Roles and scopes are just compression layers.

---

STEP 1 — MODEL THE TRUTHS FIRST

Ask:

What must be true in the system for a user to act?

Examples

- user belongs to tenant T
- user owns document D
- tenant subscription is premium
- user passed verification
- user invited another member
- usage quota not exceeded

These are authority facts.

These must live in real domain tables.

---

STEP 2 — GROUP TRUTHS INTO CAPABILITY SHAPES

Now ask:

Which truths usually imply similar power?

Example

If user can:

- manage members
- manage billing
- manage settings

Then you compress into:

role = owner

That is role design.

---

STEP 3 — DEFINE ROLES AS COARSE CONTRACTS

A good role:

- has meaning outside implementation
- survives UI redesign
- survives API refactor
- maps to responsibility

Example good roles

- owner
- admin
- member
- reviewer
- operator

Example bad roles

- inference_runner_v2
- document_editor_api
- billing_route_access

Roles should describe:

authority identity,
not system plumbing.

---

STEP 4 — DEFINE SCOPES AS API SURFACES

Scopes are:

how APIs reason about allowed operations.

Example

documents:read  
documents:write  
memberships:manage  
inference:run

Scopes may be derived from roles.

Roles → scopes → route guards.

---

STEP 5 — ACCEPT THAT THIS IS ITERATIVE

You will get roles wrong initially.

All real systems evolve:

- new roles appear
- roles split
- permissions tighten
- tenant models change
- entitlements expand

This is normal.

Design for projection and token refresh,
so authority can evolve safely.

---

STEP 6 — A VERY STRONG PRACTICAL RULE

Never invent a role until you can finish this sentence:

"This role exists because in the real world this person is responsible for **\_\_**."

If you cannot fill that blank,
you are designing technical roles.

That will hurt later.

---

STEP 7 — AUTHORITY DESIGN STACK

Truth layer (domain)

- memberships
- ownership
- subscriptions
- profile state

Compression layer

- roles

Delivery layer

- scopes
- audiences
- ingress policies

Decision layer

- ABAC in services

---

FINAL SIMPLE REALISATION

Yes.

Defining authority is partly art,
because you are modelling human responsibility and product power.

But if you always:

model truths first,
then derive roles,
then derive scopes,

you will build systems that remain stable as they grow.

---

AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION

AUTHORITY MODEL DECISION TREE (PLATFORM vs TENANT vs HYBRID)

Goal

Given a new product idea,
quickly decide which authority foundation to use.

This determines:

- onboarding order
- token shape
- domains required
- RBAC surface
- entitlement placement

---

STEP 1 — CAN A USER DO SOMETHING USEFUL ALONE?

Question:

Can a single user sign up and immediately get value
without joining an organization?

YES → go PLATFORM model  
NO → go to Step 2

Examples YES

- solo AI tools
- creator dashboards
- moderation tools
- gig operator apps

Authority axis = eligibility / personal capability

---

STEP 2 — DOES VALUE EXIST ONLY INSIDE A WORKSPACE?

Question:

Must the user belong to a workspace / org / account
before any meaningful action is possible?

YES → go TENANT model  
NO → go to Step 3

Examples YES

- Slack
- Notion
- CRM
- team analytics
- your legal AI workspace product

Authority axis = governance boundary

---

STEP 3 — ARE THERE TWO TYPES OF ACTORS?

Question:

Does the system have:

- global actors (operators / sellers / reviewers)
  AND
- tenant actors (admins / staff / teams)

YES → go HYBRID model

Examples

- delivery ecosystem
- marketplace
- SaaS with field operators + org admins
- vendor + workspace platforms

Authority axis = dual (eligibility + governance)

---

VISUAL SUMMARY

                 +--------------------+
                 |  Can user act      |
                 |  alone?            |
                 +---------+----------+
                           |
                     YES   |   NO
                           |
                      PLATFORM
                           |
                           v
              +------------+-------------+
              | Must belong to workspace |
              | to do anything useful?   |
              +------+-------------------+
                     |
               YES   |   NO
                     |
                    TENANT
                     |
                     v
          +----------+-----------+
          | Two actor classes?   |
          +------+---------------+
                 |
            YES  |
                 |
               HYBRID

---

WHAT EACH MODEL IMPLIES (FOUNDATION)

PLATFORM

Required domains

- auth
- profile (often)
- payments (optional)

Token

- roles
- aud

Onboarding

signup → capability → ready

---

TENANT

Required domains

- auth
- tenant
- payments (often)

Token

- tenant_id
- roles
- aud

Onboarding

signup → workspace → plan → ready

---

HYBRID

Required domains

- auth
- tenant
- profile
- payments (often)

Token

- platform_roles
- tenant_roles
- tenant_id
- aud

Onboarding

signup → router → capability or workspace → ready

---

WHERE RBAC LIVES

Derived from authority sources.

Platform model

- roles from profiles

Tenant model

- roles from memberships

Hybrid model

- both

Minted into tokens.

Checked at ingress + services.

---

WHERE ABAC LIVES

Always inside product domains.

Examples

- quota remaining
- document ownership
- tenant match
- feature flag
- resource lifecycle

Never purely in auth.

---

FINAL FAST RULE

If authority comes from:

personal eligibility → PLATFORM

organizational belonging → TENANT

both → HYBRID

Design onboarding and token model accordingly.

AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION
AUTHORITY MODELS — CONCRETE FOUNDATION

---

##

##

##

##

---

\***\*\_\_\_\*\*** WTF \***\*\_\_\*\***

---

LEGAL AI INFERENCE SAAS — MINIMAL FOUNDATIONAL MODEL

Product shape

- API + UI legal inference platform (RAG / context engineering engine)
- Monetized via plans (Free / Premium)
- Usage limited by monthly tokens
- Likely organization collaboration (law firms / teams)
- No heavy operator eligibility → profile domain likely NOT required

Primary authority axis

Tenant + Plan

Not Capability.

Therefore default onboarding order:

signup → tenant → plan → ready

Profile domain optional (only if later you introduce verified lawyers / reviewers etc)

---

CORE DOMAINS

auth-api / auth-ui / auth-worker  
tenant-api / tenant-ui / tenant-worker  
payments-api / payments-ui / payments-worker  
inference-api (product domain)

All authority facts propagate via NATS → auth-worker builds projections.

---

AUTH DOMAIN (IDENTITY + TOKEN GATEWAY)

Owns:

- users
- sessions
- authority routing
- token minting
- RBAC projections
- entitlement projections

Minimal tables

users

- id
- email

sessions

- id
- user_id

authority_requirements

- require_tenant = true
- require_plan = true
- require_profile = false

auth_tenant_access

- user_id
- tenant_id
- roles[]

auth_entitlements

- subject_id (tenant_id preferred)
- plan (free / premium)
- token_quota

Auth subscribes to:

membership.granted  
subscription.started  
subscription.updated

---

TENANT DOMAIN (WORKSPACE / LAW FIRM)

Purpose

- workspace boundary
- collaboration
- shared document context
- shared token usage pool

Minimal tables

tenants

- id
- name
- owner_user_id

memberships

- tenant_id
- user_id
- role (owner / admin / member)
- status

Events

tenant.created  
membership.granted  
membership.revoked

Auth-worker reaction

→ update auth_tenant_access projection

---

PAYMENTS DOMAIN (STRIPE INTEGRATION)

Purpose

- subscription lifecycle
- token quota entitlement
- billing ownership

Scope decision (important)

Best practice:

Plans are TENANT-scoped  
Not user-scoped

Because:

- law firms share usage
- billing usually org-level
- token pools easier to manage

Minimal tables

customers

- id
- tenant_id

subscriptions

- id
- tenant_id
- plan
- status

plans

- id
- name
- monthly_token_limit

usage_counters

- tenant_id
- current_month_tokens_used

Events

subscription.started  
subscription.updated  
subscription.cancelled

Auth-worker reaction

→ update auth_entitlements

---

INFERENCE DOMAIN (PRODUCT DOMAIN)

Purpose

- RAG pipelines
- document ingestion
- vector indexing
- inference execution
- usage metering

Minimal tables

documents

- id
- tenant_id
- uploaded_by

inference_requests

- id
- tenant_id
- user_id
- tokens_used

No authority stored here.
Authority consumed from token.

---

END-TO-END USER JOURNEY

1. Signup

User
→ auth-ui signup

Auth
→ create user  
→ create session

Auth checks requirements

Missing tenant  
Missing plan

auth-ui routes → tenant-ui

---

2. Tenant onboarding

User
→ tenant-ui

Options

- create workspace
- accept invite

Tenant domain
→ create tenant  
→ create membership

tenant-worker
→ NATS membership.granted

auth-worker
→ update auth_tenant_access

User returns to auth-ui

Still missing plan

auth-ui routes → payments-ui

---

3. Plan onboarding

User
→ payments-ui

User selects:

Free plan OR Premium plan

Payments domain
→ create stripe subscription  
→ store subscription

payments-worker
→ NATS subscription.started

auth-worker
→ update auth_entitlements

User returns to auth-ui

All requirements satisfied

Auth mints token

User enters platform

---

READY STATE

User is operational when:

- membership active
- subscription active
- entitlement projected

Token contains:

sub  
tenant_id  
tenant_roles  
plan  
(optional quota_remaining snapshot)

---

INFERENCE REQUEST FLOW

Client
→ inference-api

Ingress may check:

- token valid
- aud = inference-api

Service checks RBAC

- tenant_roles contains member/admin

Service checks ABAC

- request.tenant_id == token.tenant_id

Service checks entitlement

- plan active
- quota remaining

Then:

execute RAG  
meter tokens  
update usage counter

If quota exceeded → deny

---

USAGE MODEL

Quota enforcement belongs to:

Inference domain OR Payments domain (metering worker)

Not auth.

Auth only reflects entitlement state.

---

FUTURE EXTENSIONS

If later you introduce:

- verified legal reviewers
- compliance-approved contributors

Then add profile domain:

signup → tenant → profile → ready

Profile events then project platform roles like:

legal_reviewer

But this is NOT required for initial SaaS.

---

FINAL FOUNDATION FOR THIS PRODUCT

Authority sources enabled

Tenant governance  
Commercial entitlement

Capability lifecycle disabled (initially)

Onboarding order

signup  
→ workspace  
→ subscription  
→ ready

Auth remains:

identity + projection + token gateway

Tenant owns collaboration boundary  
Payments owns monetization  
Inference owns product logic + quota enforcement  
NATS connects all authority state

----- PROMPT ----------------------------------------------

You are a senior platform / SaaS systems design expert.

Your task is to help me design the AUTHORITY TOPOLOGY for a new product.

You must guide me through modelling:

- authority truths
- authority sources
- authority boundaries
- authority projection
- RBAC surface
- ABAC enforcement
- onboarding flow

The system constraints are FIXED:

- Event-driven architecture (NATS)
- SCS domains (self-contained systems)
- Central auth domain:
  - auth-api
  - auth-ui
  - auth-worker
- Auth owns:
  - identity (passkeys)
  - sessions / refresh tokens
  - authority projections
  - token minting
  - onboarding routing
- Other domains emit authority lifecycle events
- Auth NEVER owns business authority truth
- Tokens are authority snapshots
- RBAC is derived from projections
- ABAC is enforced in product domains

Your goal is NOT to design infra or code.
Your goal is to design the cleanest possible authority model.

You must follow this strict modelling order:

STEP 1 — PRODUCT POWER MODEL

Ask me questions to determine:

- Can a user get value alone?
- Must they belong to an organization / workspace?
- Are there multiple actor types (operators vs org staff)?
- Is eligibility / verification required?
- Is consumption limited by plans or quota?
- Are resources owned by users or tenants?

Then classify the product authority topology as:

- PLATFORM authority
- TENANT authority
- HYBRID authority

Explain WHY.

Do not proceed until topology is clear.

---

STEP 2 — AUTHORITY TRUTHS

Help me identify real authority facts such as:

- memberships
- ownership
- subscription state
- profile lifecycle
- feature flags
- usage limits

These must be domain-owned truths.

Do NOT talk about roles yet.

---

STEP 3 — AUTHORITY SOURCES

From the truths, identify which domains exist:

- profile domain (global capability)
- tenant domain (governance boundary)
- payments domain (entitlements)
- product domain (resource truth)

Define minimal tables and events per domain.

---

STEP 4 — ONBOARDING AUTHORITY ACQUISITION FLOW

Design onboarding as authority acquisition:

signup → missing authority detection → redirect to domain UI

Define:

- what makes a user operationally ready
- what authority step comes first and why

---

STEP 5 — RBAC DESIGN

Now derive roles from authority truths.

Roles must:

- represent real responsibility
- survive API / UI refactors
- be coarse-grained

Then derive scopes from roles.

---

STEP 6 — TOKEN SHAPE

Define minimal access token claims:

- audience (service boundary)
- tenant context (if any)
- roles
- entitlement hints

Do not overdesign.

---

STEP 7 — ABAC SURFACE

Identify where contextual enforcement must happen:

- ownership
- quota
- lifecycle state
- tenant match

Clarify which service owns which decision.

---

OUTPUT FORMAT

Always respond with:

1. Authority topology classification
2. Authority truths
3. Domains + minimal tables/events
4. Onboarding authority flow
5. Roles + scopes
6. Token minimal shape
7. ABAC enforcement points

Keep answers concrete.
Avoid storytelling.
Avoid overengineering.
Optimize for conceptual clarity.

---

# Auth Route Contract Design

## Purpose

This document defines a minimal, stable authentication route contract for the auth domain.

The goal is to collapse the current passkey-specific public surface:

- `POST /auth/v1/passkeys/register/challenge`
- `POST /auth/v1/passkeys/register`
- `POST /auth/v1/passkeys/login/challenge`
- `POST /auth/v1/passkeys/login`

into a provider-agnostic surface that can support:

- WebAuthn / passkeys
- external identity providers (OIDC / SAML style)
- magic link authentication

without changing the session and projection model.

---

## Non-goals

This document does not redesign:

- `POST /auth/v1/sessions/refresh`
- `POST /auth/v1/sessions/token`
- session rotation semantics
- audience-scoped access token projection
- domain JWT validation model
- step-up flow routes
- authenticator enrollment management routes

Those remain unchanged.

---

## Architectural principle

Authentication is split into two layers.

### Layer 1: identity proof

This is method-specific and may vary by provider.

Examples:

- WebAuthn registration ceremony
- WebAuthn authentication ceremony
- OIDC redirect and code exchange
- magic link issuance and verification

### Layer 2: platform session issuance

Once identity proof succeeds, the auth domain:

1. resolves the internal user
2. creates or upgrades a platform session
3. returns a platform refresh token

All downstream auth behavior remains the same:

- refresh token rotates session
- refresh token exchanges for audience-scoped access token
- domains validate access JWTs locally

---

## Stable public routes

The public authentication surface is reduced to two routes:

- `POST /auth/v1/auth/begin`
- `POST /auth/v1/auth/complete`

These routes describe the lifecycle of an authentication ceremony.

`begin` starts the ceremony.

`complete` submits proof and, on success, returns a platform refresh token.

---

## Route 1: POST /auth/v1/auth/begin

### Semantics

Starts an authentication ceremony.

The caller specifies the authentication method and any method-specific initiation data.

The auth service returns instructions for the next step.

### Request contract

```json
{
  "method": "passkey | oidc | magic_link",
  "intent": "login | register",
  "provider": "string",
  "email": "string"
}
```

### Field meanings

#### `method`

Required.

Identifies the authentication mechanism.

Allowed values in the current design:

- `passkey`
- `oidc`
- `magic_link`

#### `intent`

Optional globally, but required for passkeys in this design.

Used to distinguish between WebAuthn registration and WebAuthn authentication ceremonies.

Allowed values:

- `login`
- `register`

For `oidc` and `magic_link`, this field may be omitted.

#### `provider`

Optional.

Used when `method = "oidc"`.

Examples:

- `google`
- `auth0`
- `okta`
- `entra`

#### `email`

Optional.

Used when `method = "magic_link"`.

---

## Begin response contract

The response is shape-driven. The `type` field tells the client what to do next.

```json
{
  "type": "webauthn_options | redirect | email_sent",
  "payload": {}
}
```

### Field meanings

#### `type`

Required.

Defines the next client action.

Allowed values in the current design:

- `webauthn_options`
- `redirect`
- `email_sent`

#### `payload`

Required.

Method-specific object containing what the client needs for the next step.

---

## Begin examples

### Passkey login begin

Request:

```json
{
  "method": "passkey",
  "intent": "login"
}
```

Response:

```json
{
  "type": "webauthn_options",
  "payload": {
    "intent": "login",
    "publicKey": {}
  }
}
```

Notes:

- server generates authentication challenge
- server stores challenge state exactly like current login challenge flow
- client must call `navigator.credentials.get()` / `startAuthentication()`

### Passkey register begin

Request:

```json
{
  "method": "passkey",
  "intent": "register"
}
```

Response:

```json
{
  "type": "webauthn_options",
  "payload": {
    "intent": "register",
    "publicKey": {}
  }
}
```

Notes:

- server generates registration challenge
- server stores challenge state exactly like current registration challenge flow
- client must call `navigator.credentials.create()` / `startRegistration()`

### OIDC begin

Request:

```json
{
  "method": "oidc",
  "provider": "google"
}
```

Response:

```json
{
  "type": "redirect",
  "payload": {
    "url": "https://provider.example/authorize?..."
  }
}
```

Notes:

- client navigates to `payload.url`
- provider callback handling is implementation-specific
- final proof is submitted through `auth/complete`

### Magic link begin

Request:

```json
{
  "method": "magic_link",
  "email": "user@example.com"
}
```

Response:

```json
{
  "type": "email_sent",
  "payload": {}
}
```

Notes:

- server sends one-time magic link or code
- final proof is submitted through `auth/complete`

---

## Route 2: POST /auth/v1/auth/complete

### Semantics

Submits proof for a previously started authentication ceremony.

If proof succeeds, the auth service creates or upgrades a platform session and returns a platform refresh token.

This route always terminates in platform session issuance.

### Request contract

```json
{
  "method": "passkey | oidc | magic_link",
  "payload": {}
}
```

### Field meanings

#### `method`

Required.

Identifies which verifier should process the submitted proof.

#### `payload`

Required.

Method-specific proof object.

---

## Complete response contract

```json
{
  "refresh_token": "string",
  "new_user": true
}
```

### Field meanings

#### `refresh_token`

Required.

A platform refresh token representing the newly created or upgraded platform session.

This token is then used with:

- `POST /auth/v1/sessions/refresh`
- `POST /auth/v1/sessions/token`

#### `new_user`

Optional but recommended.

Indicates whether this completion created a new internal user during identity resolution.

Useful for onboarding UX.

---

## Complete examples

### Passkey login complete

Request:

```json
{
  "method": "passkey",
  "payload": {
    "intent": "login",
    "authentication": {}
  }
}
```

Server behavior:

- parse WebAuthn authentication response
- verify against stored login challenge
- resolve internal user from credential
- create session
- return refresh token

Response:

```json
{
  "refresh_token": "...",
  "new_user": false
}
```

### Passkey register complete

Request:

```json
{
  "method": "passkey",
  "payload": {
    "intent": "register",
    "credential": {}
  }
}
```

Server behavior:

- parse WebAuthn registration response
- verify against stored registration challenge
- create internal user if needed
- store authenticator credential
- create session
- return refresh token

Response:

```json
{
  "refresh_token": "...",
  "new_user": true
}
```

### OIDC complete

Request:

```json
{
  "method": "oidc",
  "payload": {
    "provider": "google",
    "code": "...",
    "state": "..."
  }
}
```

Server behavior:

- exchange authorization code with provider
- verify returned identity proof
- resolve internal user from external identity
- create session
- return refresh token

Response:

```json
{
  "refresh_token": "...",
  "new_user": false
}
```

### Magic link complete

Request:

```json
{
  "method": "magic_link",
  "payload": {
    "token": "..."
  }
}
```

Server behavior:

- verify magic link token or code
- resolve or create internal user
- create session
- return refresh token

Response:

```json
{
  "refresh_token": "...",
  "new_user": true
}
```

---

## Why passkeys still need login vs register

Passkeys remain the only currently supported method that requires explicit distinction between two different ceremonies:

- registration ceremony
- authentication ceremony

Those are fundamentally different WebAuthn operations.

This design keeps only two public routes, but still allows the server to branch internally based on:

- `method = passkey`
- `payload.intent = login | register`

So the public surface is simplified without pretending the WebAuthn ceremonies are identical.

---

## Why there is no universal industry-standard JSON contract

There is no universal cross-vendor REST standard for auth broker routes.

What is standard is:

- OIDC protocol semantics
- SAML protocol semantics
- WebAuthn client and verification semantics

What is common across platforms is conceptual structure:

- begin authentication
- complete authentication
- create session

This document therefore standardizes the auth domain’s platform contract, not an industry-mandated schema.

---

## Why session routes remain unchanged

These authentication routes only affect identity proof and session creation.

They do not change the platform session model.

Therefore these routes remain stable and frozen:

- `POST /auth/v1/sessions/refresh`
- `POST /auth/v1/sessions/token`

That remains true even when adding:

- external IdPs
- magic links
- step-up later
- additional authentication methods

The downstream contract is still:

1. complete authentication
2. receive refresh token
3. refresh rotates platform session
4. exchange refresh for audience-scoped access token

---

## Migration mapping from current passkey routes

### Current

- `POST /auth/v1/passkeys/register/challenge`
- `POST /auth/v1/passkeys/register`
- `POST /auth/v1/passkeys/login/challenge`
- `POST /auth/v1/passkeys/login`

### New

#### Register challenge

Maps to:

```http
POST /auth/v1/auth/begin
```

Request:

```json
{
  "method": "passkey",
  "intent": "register"
}
```

#### Register complete

Maps to:

```http
POST /auth/v1/auth/complete
```

Request:

```json
{
  "method": "passkey",
  "payload": {
    "intent": "register",
    "credential": {}
  }
}
```

#### Login challenge

Maps to:

```http
POST /auth/v1/auth/begin
```

Request:

```json
{
  "method": "passkey",
  "intent": "login"
}
```

#### Login complete

Maps to:

```http
POST /auth/v1/auth/complete
```

Request:

```json
{
  "method": "passkey",
  "payload": {
    "intent": "login",
    "authentication": {}
  }
}
```

---

## Recommended implementation guidance

### Keep internally separate services

Even if the public surface collapses to two routes, internal implementation should remain explicit:

- create passkey registration challenge
- verify passkey registration
- create passkey authentication challenge
- verify passkey authentication
- start oidc redirect
- complete oidc callback
- send magic link
- consume magic link

The route unification is a contract simplification, not a mandate to merge internal logic.

### Keep sessions as the stable platform contract

The important system invariant is preserved:

- authentication methods evolve
- session management stays stable
- projection stays stable

---

## Final summary

This design intentionally freezes a minimal, provider-agnostic authentication surface:

- `POST /auth/v1/auth/begin`
- `POST /auth/v1/auth/complete`

It supports:

- passkey login
- passkey registration
- OIDC / external IdP login
- magic link login

while preserving the existing session and projection architecture unchanged.

This is the main reason to adopt it: identity proof evolves, but platform session and capability projection remain stable.
