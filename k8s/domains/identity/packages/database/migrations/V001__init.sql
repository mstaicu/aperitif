-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY
);

COMMENT ON TABLE users IS 'Stable first-party identity subjects authenticated by this domain.';
COMMENT ON COLUMN users.id IS 'User subject identifier issued by identity and referenced by other domains through tokens.';

CREATE TABLE passkey_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    credential_id BYTEA NOT NULL UNIQUE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    public_key BYTEA NOT NULL,

    sign_count BIGINT NOT NULL DEFAULT 0
);

COMMENT ON TABLE passkey_credentials IS 'WebAuthn passkey credentials bound to identity users.';
COMMENT ON COLUMN passkey_credentials.id IS 'Stable internal passkey credential row identifier.';
COMMENT ON COLUMN passkey_credentials.credential_id IS 'Authenticator credential id used to find the passkey during login.';
COMMENT ON COLUMN passkey_credentials.user_id IS 'User that owns this passkey credential.';
COMMENT ON COLUMN passkey_credentials.public_key IS 'Authenticator public key used to verify WebAuthn assertions.';
COMMENT ON COLUMN passkey_credentials.sign_count IS 'Authenticator signature counter used for replay and cloned-credential detection.';

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID,

    challenge BYTEA NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW() + INTERVAL '2 minutes'
);

COMMENT ON TABLE challenges IS 'Short-lived WebAuthn registration and login challenges.';
COMMENT ON COLUMN challenges.id IS 'Stable challenge row identifier.';
COMMENT ON COLUMN challenges.user_id IS 'User associated with the challenge when known; login challenges may start without a user.';
COMMENT ON COLUMN challenges.challenge IS 'Random WebAuthn challenge bytes sent to the browser.';
COMMENT ON COLUMN challenges.expires_at IS 'Time after which the challenge must not be accepted.';

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    refresh_token_hash BYTEA NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ
);

COMMENT ON TABLE sessions IS 'Refresh-token backed identity sessions.';
COMMENT ON COLUMN sessions.id IS 'Stable session identifier.';
COMMENT ON COLUMN sessions.user_id IS 'User authenticated by this session.';
COMMENT ON COLUMN sessions.refresh_token_hash IS 'Hash of the refresh token; the raw refresh token is never stored.';
COMMENT ON COLUMN sessions.created_at IS 'Time the session was created.';
COMMENT ON COLUMN sessions.last_refreshed_at IS 'Time the session refresh token was last rotated.';
COMMENT ON COLUMN sessions.expires_at IS 'Time after which the session must not be refreshed.';
COMMENT ON COLUMN sessions.revoked_at IS 'Time the session was explicitly revoked, if any.';
