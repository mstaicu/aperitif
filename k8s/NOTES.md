(core) identity -> owns users, passkeys, sessions, and operator identity.

(core) accounts -> owns the account boundary and membership topology. Product resources are scoped to accounts, but owned by product domains.

(core) entitlements -> owns account-level unlocks and limits. Operators, payments, compliance, onboarding, or product domains can grant/revoke entitlement contributions; entitlements computes the effective account snapshot.

(product) future compliance -> owns checks/proofs and policy decisions for individuals, businesses, and account contexts. It maps proven state to entitlement grants when product behavior should unlock.


For example:

1. A user opens an account for a personal or business context.
2. The account establishes the product boundary: where resources live, who can act there, and under which membership/permission model.
3. Compliance checks/proofs attach to the evaluated subject: individual, business, or account context.
4. Compliance can grant/revoke entitlement contributions when proven state should unlock product behavior.
5. Entitlements attach to the account because product behavior happens inside that account boundary. For example: transfers.enabled = true.
6. Membership/permissions decide what a specific user can do inside the account, such as read, create, approve, delete, or manage resources.


For example:

members create resources
account owns/scopes those resources
entitlements unlock what the account can use
permissions decide what each member can do

Alice creates a document inside Account A.
The document belongs to Account A, not directly to Alice.

Account A has documents.enabled = true.
Alice has permission to create documents.