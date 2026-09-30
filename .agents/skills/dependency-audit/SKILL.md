---
name: dependency-audit
description: Audit credential-evidence's validators, generators, migration tools, and exporters for vulnerable dependencies and provenance risk. Use for dependency or supply-chain audits. Report-only unless fixes are requested.
---

# Dependency audit

Read the repository boundary and inventory actual manifests and lockfiles; do
not assume npm, Cargo, or Python tooling exists before it appears in the tree.

Run ecosystem-native locked-graph audits with recorded tool/database versions.
Classify dependencies by validator, schema tooling, generator/migration,
exporter, documentation tooling, or CI-only use. Prioritize libraries that
parse YAML/JSON, resolve references, render templates, fetch sources, traverse
files, or produce public snapshots.

For each advisory report locked version, affected capability, reachability from
repository inputs, severity, and a compatible remediation. Also inspect
unpinned source dependencies and generated-code tools whose version affects
reproducibility.

Do not classify credential families, evidence sources, or scanner mappings as
software dependencies.

