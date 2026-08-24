# Documentation

## Platform model

```text
identity    durable record for a human or machine
principal   identity to which a request is attributed
credential  long-lived proof of an identity
account     ownership and authorization boundary
authority   what current domain facts allow the principal to do
```

```text
credential -> Auth -> short-lived access token -> domain API
```

Auth proves identity. Domain APIs decide authority from current membership,
resource facts, and business rules.

## Documents

- [features](features/) — reusable platform capabilities. They may change core
  domains but never own product resources or business workflows.
- [recipes](recipes/) — product blueprints. They define product domains and
  assemble the platform features they require.

## Index

### Features

- [Personal access tokens](features/personal-access-tokens.md) — unattended
  human automation; proposed.
- [Machine identities](features/machine-identities.md) — autonomous machine
  access; proposed.
- [Operators](features/operators.md) — platform-wide human authority;
  implemented.

### Recipes

- [Automated farm](recipes/automated-farm.md) — Farm product domain;
  illustrative.

Operational instructions stay beside the code they operate.
