# Development and release

**Proposed.** Use these cases to evaluate changes to Identity's development loop and release process.

| When | Acceptance criterion |
| --- | --- |
| A developer starts with an empty database or changes a migration | A successful start uses the requested SQL. A failed migration is visible and blocks that start. |
| Two people or agents run Identity concurrently | Each can edit, inspect, test, and tear down its own installation without disturbing the other. |
| A release candidate passes end-to-end checks | Staging selects the tested source revision and image digests, including the relay version used for that run. |
| A candidate fails or an operator rolls back | The previous working release can stay selected. Automation cannot immediately reselect the rejected version. |

The current entry points are the [development procedure](run-locally.md) and [Identity publication workflow](../../../.github/workflows/identity-publish.yaml). The choice of a different local runner or a coordinated staging release remains open.
