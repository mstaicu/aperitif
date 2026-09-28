# Account membership

Status: Membership feed implemented; management API proposed. Owner: Accounts.

Accounts owns generic membership:

    id          Durable membership resource identifier
    account_id  Account boundary
    subject_id  Opaque Auth subject
    role        owner, admin, or member
    status      active or inactive

This extension adds owner-managed listing, role changes, and removal:

    GET    /v1/accounts/{account_id}/members
    PUT    /v1/accounts/{account_id}/members/{subject_id}
    DELETE /v1/accounts/{account_id}/members/{subject_id}

An Account retains at least one owner. Role changes and removal are idempotent.
Human admission remains the invitation boundary, not a public member-creation
route.

Membership changes do not change Account state. Accounts publishes each membership as a separate current resource with its
own identifier and monotonic version:

    subject: accounts.membership.v1.{membership-id}
    type:    accounts.membership.snapshot.v1
    data:    id, account_id, subject_id, role, status, version

Removal marks the existing membership inactive, increments its version, and
publishes a newer snapshot on the same subject. Re-adding that subject activates
the same membership and increments its version again. Consumers authorize only
an active membership. This does not become a delta in the Account feed.

Build this when Account owners need to manage existing members. Notifications,
fresh authentication, durable evidence, approvals, and review follow only when
access risk requires them.
