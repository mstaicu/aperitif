CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    kind TEXT NOT NULL CHECK (kind IN ('personal', 'organization')),

    status TEXT NOT NULL CHECK (status IN ('pending_activation', 'active', 'suspended', 'closed')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account_memberships (
    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (account_id, user_id)
);

CREATE TABLE account_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    type TEXT NOT NULL,

    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),

    UNIQUE (account_id, type)
);

CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    account_id UUID NOT NULL
        REFERENCES accounts(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE space_memberships (
    space_id UUID NOT NULL
        REFERENCES spaces(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL,

    role TEXT NOT NULL,

    PRIMARY KEY (space_id, user_id)
);

CREATE TABLE space_admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    space_id UUID NOT NULL
        REFERENCES spaces(id)
        ON DELETE CASCADE,

    user_id UUID NULL,

    requested_role TEXT NOT NULL,

    status TEXT NOT NULL CHECK (status IN ('open', 'completed', 'failed', 'cancelled', 'expired'))
);

CREATE TABLE space_admission_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    admission_id UUID NOT NULL
        REFERENCES space_admissions(id)
        ON DELETE CASCADE,

    type TEXT NOT NULL,

    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),

    UNIQUE (admission_id, type)
);

-- | Table                             | Meaning                            |
-- | --------------------------------- | ---------------------------------- |
-- | `account_requirements`            | what must happen before activation |
-- | `account_memberships.role`        | tenant/customer authority          |
-- | `space_memberships.role`          | role you **already have**          |
-- | `space_admissions.requested_role` | role you are **trying to get**     |
-- | `space_admission_requirements`    | what must happen before you get it |
