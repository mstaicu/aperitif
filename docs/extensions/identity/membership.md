# Identity membership

Status: Membership feed implemented; management API proposed. Owner: Identity.

Identity owns generic membership:

    id          Durable membership resource identifier
    account_id  Account boundary
    subject_id  Opaque Identity subject
    role        owner, admin, or member
    status      active or inactive

This extension adds owner-managed listing, role changes, and removal:

    GET    /v1/accounts/{account_id}/members
    PUT    /v1/accounts/{account_id}/members/{subject_id}
    DELETE /v1/accounts/{account_id}/members/{subject_id}

An Account retains at least one owner. Role changes and removal are idempotent.
Human admission remains the invitation boundary, not a public member-creation
route.

Membership changes do not change Account state. Identity publishes each membership as a separate current resource with its
own identifier and monotonic version:

    NATS subject:       identity.membership.v1.{membership-id}
    type:               identity.membership.snapshot.v1
    CloudEvent subject: membership/{membership-id}
    data:    id, account_id, subject_id, role, status, version

Removal marks the existing membership inactive, increments its version, and
publishes a newer snapshot on the same subject. Re-adding that subject activates
the same membership and increments its version again. Consumers authorize only
an active membership. This does not become a delta in the Account feed.

Build this when Account owners need to manage existing members. Notifications,
fresh authentication, durable evidence, approvals, and review follow only when
access risk requires them.
