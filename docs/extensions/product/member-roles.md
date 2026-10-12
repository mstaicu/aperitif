# Product member roles

Status: Proposed. Owner: the Product domain.

Identity decides generic membership. A Product stores its own role assignments.
Identity never stores Product vocabulary.

    GET    /v1/accounts/{account_id}/members/{subject_id}/roles
    PUT    /v1/accounts/{account_id}/members/{subject_id}/roles/{role_id}
    DELETE /v1/accounts/{account_id}/members/{subject_id}/roles/{role_id}

An active Identity Account owner manages roles; an active member reads only their own.
PUT and DELETE are idempotent. Role IDs are Product-defined.

When the Product needs current membership locally, it projects the separate
Identity membership feed. In one transaction, it ignores an old membership
version; otherwise it updates the member projection and stores the source
version. An inactive membership removes that subject's Product roles. Role
routes require a current active projected member. Re-adding a member does not
restore removed Product roles.

Build this when a Product needs permissions beyond Identity membership. Keep
invitation roles out of Identity: when a Product actually needs them, either
Identity exports current invitation state or the Product owns that workflow.
