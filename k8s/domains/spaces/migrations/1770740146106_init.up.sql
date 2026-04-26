CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
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

    space_id UUID NULL
        REFERENCES spaces(id)
        ON DELETE SET NULL,

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
-- | `space_memberships.role`          | role you **already have**          |
-- | `space_admissions.requested_role` | role you are **trying to get**     |
-- | `space_admission_requirements`    | what must happen before you get it |
