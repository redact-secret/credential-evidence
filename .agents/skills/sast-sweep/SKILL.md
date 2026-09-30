---
name: sast-sweep
description: Run static analysis over credential-evidence's validators, generators, importers, migrations, and exporters for unsafe parsing, paths, fetching, templates, and credential leakage. Report-only unless fixes are requested.
---

# SAST sweep

Select analyzers from the actual languages and manifests. Record versions and
scope. Prioritize:

- path traversal and symlink escape in fixture/source handling;
- unsafe YAML or object deserialization and prototype pollution;
- remote fetches without scheme, host, size, timeout, or redirect controls;
- archive extraction and generated-output overwrite;
- template injection or unsafe HTML/Markdown generation;
- nondeterministic iteration in canonical exporters;
- credential-shaped values copied into logs, errors, snapshots, or test output;
- schema validation performed after canonical data is consumed.

Triage every hit against surrounding code. Report severity, file/line, data
flow, guard, impact on evidence integrity or confidentiality, and a regression
test. Do not report unsupported research claims as SAST vulnerabilities.

