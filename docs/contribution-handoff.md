# Contribution handoff: states, owners and the researcher route

Core defines the vocabulary; this page mirrors it unchanged and adds nothing to it. The authority is core's
[implementation-ready handoff contract](https://github.com/redact-secret/redact-secret/blob/main/docs/contracts/contribution/implementation-ready-handoff.md)
(see "What other repositories mirror"); the benchmarks side is
[`contribution-handoff-states`](https://github.com/redact-secret/redact-secret-benchmarks/blob/main/docs/specs/contribution-handoff-states.md#shared-vocabulary).
This repository is maintained by the Redact Secret project, so a handoff written here is project-authored research, not
independent validation.

## The five states and who applies them

The words label a work item (an issue), never a family. They appear as `state:` labels on the core implementation issue.

| State | Meaning | Applied by |
| --- | --- | --- |
| `intake` | A report or suggestion was received and is not yet triaged | any contributor opens it; a core maintainer triages |
| `research-needed` | Triaged; shapes, sources or issuance are not yet recorded or reviewed | the researcher on the case, here |
| `implementation-ready` | Research is reviewed and core adopted the contract | core |
| `verification-needed` | Core implemented a candidate that benchmarks has not measured | core |
| `complete` | Benchmarks measured that exact candidate and recorded the result | benchmarks |

The researcher owns the move from `intake` to `research-needed` and the research handoff itself. Core applies
`implementation-ready` and `verification-needed`; benchmarks applies `complete`. Research and implementation are separate
issues: the research issue lives here, the implementation issue lives in core.

No handoff and no state word grants a support status, finding type or action. `complete` means the loop closed, not that a
candidate passed. Support-status promotion stays with benchmarks. Nothing here changes evidence classes, review rules or
the [solo-maintainer period](governance/solo-maintainer-period.md).

## What a reviewed handoff gives core

Core copies these into its `*.handoff.json` fields without re-deriving them.

- **Its commit.** State the full 40-hex commit of `main` that holds the reviewed handoff (the merge commit of the pull
  request that added it). Core fills `research.handoff` with the permalink to the file at that commit and `research.readAt`
  with the commit it read. A branch name or a short hash is not enough.
- **Exclusions.** A list `exclusions`, one line per entry: `<excluded shape, gated part or accepted false negative> --
  <reason>`. Core copies it into `exclusions[]`.
- **Twins.** A list `twins`, one line per entry: `<near-miss twin or benign sibling> -- <why it is a control>`. Core copies it
  into `twins[]`.
- **Limitations.** Every unresolved limitation of the evidence is stated explicitly, one line each, and also appears in
  `exclusions`. Core restates each limitation as an exclusion, so a limitation that is only in prose is missed.
- **Verdict and tier.** The handoff's verdict (`ready` or not) and evidence tier, as they stand at that commit.

Describe shapes as words or grammar. No field holds a real, revoked-but-real or realistic credential value
([safety](governance/safety.md)); example values are unmistakably synthetic.

## First-time researcher: one route

Open core's [Request sensitive-data support](https://github.com/redact-secret/redact-secret/issues/new?template=request-detector.yml)
form (`.github/ISSUE_TEMPLATE/request-detector.yml` in `redact-secret/redact-secret`). That is the only entry point for a
new request. Do not also open a form here for the same request; a source, case, correction or dispute form here is for
evidence work on a case that already exists.
