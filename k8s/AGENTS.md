# AGENTS.md

This file is intentionally small. Add only non-obvious repo rules, tool
gotchas, or repeated agent failure cases.

- If rendered manifests are needed for analysis, sanitize Kubernetes Secret
  payloads before reading or showing output. Replace `Secret.data` values with
  `ZHVtbXk=` and `Secret.stringData` values with `dummy`.
- Keep encrypted Secret manifests encrypted. Do not replace them with plaintext.
- If an instruction here becomes obvious from code, tests, or README updates,
  delete it from this file.
