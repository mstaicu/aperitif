# AGENTS.md

Identity owns authentication identity only. Do not add tenants,
memberships, tenant authority, onboarding requirements, or product permissions
to this domain.

- Keep the public identity contract as token issuer plus JWKS verification.
  Other domains authorize from their own state after verifying tokens.
- Keep the shared product API audience unless the whole auth model is being
  deliberately changed.
- There is no identity worker right now. Add one only for a real event
  contract, and copy the tenancy worker spine instead of reviving older worker
  code.
- Do not read or write tenancy/tenant data from identity.
