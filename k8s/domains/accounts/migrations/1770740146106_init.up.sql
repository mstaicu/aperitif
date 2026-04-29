CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    kind TEXT NOT NULL CHECK (kind IN ('personal', 'organization')),

    status TEXT NOT NULL CHECK (status IN ('pending_activation', 'active', 'suspended', 'closed')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE accounts IS 'Customer/tenant root used for account lifecycle, commercial ownership, and account-scoped product authority.';
COMMENT ON COLUMN accounts.id IS 'Stable account identifier referenced by account-owned resources in other domains.';
COMMENT ON COLUMN accounts.name IS 'Human-readable account name shown to users and operators.';
COMMENT ON COLUMN accounts.kind IS 'Baseline account shape: personal for consumer use cases, organization for business use cases.';
COMMENT ON COLUMN accounts.status IS 'Lifecycle gate for account-scoped product access.';
COMMENT ON COLUMN accounts.created_at IS 'Time the account record was created.';

CREATE TABLE account_memberships (
    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (account_id, user_id)
);

COMMENT ON TABLE account_memberships IS 'Users that can act inside an account.';
COMMENT ON COLUMN account_memberships.account_id IS 'Account where the user has authority.';
COMMENT ON COLUMN account_memberships.user_id IS 'Identity user id from the identities domain.';
COMMENT ON COLUMN account_memberships.role IS 'Account-level authority; owner manages the account, member can use account-scoped product capabilities.';
COMMENT ON COLUMN account_memberships.created_at IS 'Time the membership was granted.';

CREATE TABLE account_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    type TEXT NOT NULL,

    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),

    UNIQUE (account_id, type)
);

COMMENT ON TABLE account_requirements IS 'Activation requirements that must be completed before an account can become active.';
COMMENT ON COLUMN account_requirements.id IS 'Stable requirement row identifier.';
COMMENT ON COLUMN account_requirements.account_id IS 'Account this activation requirement belongs to.';
COMMENT ON COLUMN account_requirements.type IS 'Requirement capability key owned by another domain, such as terms_acceptance or identity_verification.';
COMMENT ON COLUMN account_requirements.status IS 'Requirement lifecycle tracked by accounts from external fulfillment signals.';

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    subject TEXT NOT NULL,

    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_version BIGINT NOT NULL,

    payload JSONB NOT NULL,

    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);

COMMENT ON TABLE outbox_events IS 'Transactional outbox for durable account-domain events waiting to be published to the event bus.';
COMMENT ON COLUMN outbox_events.id IS 'Stable event id used by consumers for idempotency.';
COMMENT ON COLUMN outbox_events.subject IS 'Event bus subject, for example accounts.account.created.';
COMMENT ON COLUMN outbox_events.aggregate_type IS 'Type of aggregate that changed, for example account.';
COMMENT ON COLUMN outbox_events.aggregate_id IS 'Identifier of the aggregate that changed.';
COMMENT ON COLUMN outbox_events.aggregate_version IS 'Producer-supplied aggregate version used by consumers for ordering and idempotency.';
COMMENT ON COLUMN outbox_events.payload IS 'JSON event body published to the event bus.';
COMMENT ON COLUMN outbox_events.occurred_at IS 'Time the domain event was recorded in the same transaction as the state change.';
COMMENT ON COLUMN outbox_events.published_at IS 'Null until a worker successfully publishes the event.';
