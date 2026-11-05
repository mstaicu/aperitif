# Identity API simplification

Reviewed and deployed locally on 5 November 2026 using three parallel reviewers.

## Result

Keep the nine explicit passkey routes. Registration, authentication,
addition and removal have different authorization and challenge contexts;
combining them would make clients infer behavior from authentication state.
The selected implementation uses fewer conversions, guards and schema objects,
while retaining those boundaries. No functions were added.

Against the preserved staged baseline, passkey JavaScript source changed as follows
(physical lines, including whitespace and comments):

| Source | Before | After | Removed |
| --- | ---: | ---: | ---: |
| Routes and schemas | 793 | 620 | 173 |
| Services | 963 | 919 | 44 |
| Total | 1,756 | 1,539 | 217 |

This is a 12.4% source reduction, not a performance measurement. The count excludes
dependency lockfiles, documentation and SQL.

## Public API

| Operation | Request body | Successful result |
| --- | --- | --- |
| `POST /v1/passkeys/registration` | `{ registration, name? }` | 201, session |
| `POST /v1/passkeys/authentication` | Raw authentication response | 200, session |
| `POST /v1/passkeys/addition` | `{ authentication, registration, name? }` | 204 |
| `POST /v1/passkeys/:id/removal` | Raw authentication response | 204; all sessions revoked |

Each ceremony retains its corresponding `/options` route. Listing remains
`GET /v1/passkeys`. Signup and addition use the same `registration` field;
single-proof authentication operations accept the browser result directly.
The UI and its forwarding routes were updated. Existing clients must regenerate
or update these pre-live paths, operation IDs and payloads.

The hierarchy is `/passkeys/<operation>/options`, then `/passkeys/<operation>`;
removal includes the target ID. The four operation nouns are registration,
authentication, addition and removal. Service names match the OpenAPI operation
IDs: `createPasskey<Operation>Options` and `completePasskey<Operation>`.
Service signatures keep dependencies first and operation input second.
Authentication takes the raw authentication response directly; addition and
removal options both take `authorization` and authenticate inside the service.

The TypeBox schemas use native enums, explicit protocol fields and titles.
Generated OpenAPI types were checked against SimpleWebAuthn browser inputs and
outputs for every workflow, without casts. Titles label inline models; no custom
compiler or reference-resolution layer was introduced. Optional protocol fields
remain compatible with the library, while services enforce the required user
handle association. See the [browser JSON workflow](https://simplewebauthn.dev/docs/packages/browser/)
and [generator dictionary behavior](https://openapi-ts.dev/advanced).

Proof-bearing removal remains POST: [OpenAPI 3.0](https://spec.openapis.org/oas/v3.0.4.html#operation-object)
does not give DELETE bodies interoperable semantics.

## Runtime and schema

SimpleWebAuthn generates challenges. Credential identifiers and challenges are
stored directly as base64url text; public keys remain `bytea`, counters `bigint`,
and resource IDs UUIDs. This follows its [server storage guidance](https://simplewebauthn.dev/docs/packages/server).
V001 contains these changes; no V003 was retained. The disposable local identity
namespace was recreated from this baseline.

User handles use the opaque UUID's UTF-8 bytes directly. Addition consumes the
authentication attempt and retrieves its paired registration challenge from SQL;
SimpleWebAuthn parses and checks the registration response. This removes duplicate
parsing. Verification uses the library's default required user verification;
generation still explicitly requests required verification and resident keys.
The impossible empty-result branch after unconditional principal insertion and
redundant challenge type guards were removed. Database constraints and library
verification determine rejection.

Keep four challenge tables, distinct addition challenges, and separate principal
lock/read statements. A generic attempt table adds nullable fields and dispatch.
Sharing a challenge introduces custom protocol assumptions. Combining the lock
and credential read can expose a snapshot taken before a concurrent removal.
These alternatives remove little code while complicating correctness.

## Security and verification

Replay, session ownership, handle ownership, duplicate credential, verification
result and final-key checks remain. In particular, SimpleWebAuthn can return
`verified: false`; absence of an exception does not prove verification.
The [WebAuthn verification rules](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion)
and [OWASP passkey guidance](https://cheatsheetseries.owasp.org/cheatsheets/Passkey_Security_Cheat_Sheet.html)
support these boundaries. No bypass was found in the reviewed flows or exercised
cases. Rate limiting remains Cloudflare's responsibility; no application limiter
or dependency was retained.

API and UI images now use Node 26.13.0, which includes the
[October security fixes](https://nodejs.org/en/blog/release/v26.12.1/).
Narrow dependency updates and version-scoped overrides address the
[glob cancellation issue](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)
and [minimatch amplification issue](https://github.com/advisories/GHSA-g3hv-75wg-m249).
All three identity packages report zero npm audit findings, including development
dependencies.

The staged baseline, first text-storage candidate and final candidate were
deployed and exercised. Final checks passed:

- 36 signed-proof workflow and negative observations, including wrong origin,
  missing user verification, wrong handle, mixed pairs, cross-ceremony proofs,
  wrong sessions and replay.
- A 38-observation variant including simultaneous removals: one removal succeeds,
  one rejects, one usable credential remains, and existing sessions are invalid.
- Five malformed nonstring challenges reject without custom type guards.
- All three existing browser E2E tests and generated-client compatibility checks.
- `make -C domains/identity check`, including 11 contract tests. The existing API
  test command discovers zero tests; deployed probes supply the API evidence.

No repository tests were added. The baseline's isolated outbox contained exactly
the expected lifecycle events and no events from failed operations. The final
local API, UI, relay and PostgreSQL deployments are ready; the temporary review
namespace was removed. Existing staged changes remain staged.
