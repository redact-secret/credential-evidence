# Unattended research runs

Issue #25 (part of epic #21). Research on this repository is meant to run on a schedule, headless, and end
in something a person can review. This page is the contract; the code is
[scripts/research-run.mjs](../../scripts/research-run.mjs) and
[scripts/lib/research-run.mjs](../../scripts/lib/research-run.mjs); the agent-facing form is the
[research-cron-run](../../.agents/skills/research-cron-run/SKILL.md) skill. The research itself is done by
the existing skills ([research-provider](../../.agents/skills/research-provider/SKILL.md),
[research-family](../../.agents/skills/research-family/SKILL.md),
[author-case](../../.agents/skills/author-case/SKILL.md),
[source-freshness](../../.agents/skills/source-freshness/SKILL.md)) under the shared
[run contract](../../.agents/skills/_shared/research-run.md). Nothing here changes what those say; this adds
the deterministic shell around them.

**No schedule exists.** The files under [examples/](examples/) are disabled examples that live outside
`.github/workflows/` and execute nothing. Activating one is a maintainer decision (see
[Activating](#activating-a-schedule)).

## What one run does

```bash
npm run research:run -- --dry-run          # plan only: no branch, PR, issue, label, push or file
npm run research:run                       # a real run (needs RESEARCH_AGENT_CMD, gh auth, see below)
npm run research:run -- --kind contract-missing --provider acme   # narrow the pool
```

| Step | Owner | Detail |
| --- | --- | --- |
| 1. Select | runner | `coverage:gaps --next` over the records as of the run date (`--as-of <date>`), in the committed priority order, plus the wishlist (`new-provider` items). Exactly one item per run. Items with `research.blockers` are skipped unless `--include-blocked` (desk research cannot clear them). |
| 2. Dedupe | runner | Reads open PRs, `research/*` and `coverage/*` branches on `origin`, and open `needs-human` issues (`gh`, read-only). An item is skipped when any of them names its tag, its branch, or the same subject under any gap kind (two PRs on one family conflict on its records and on the generated coverage files). If open work cannot be listed the run stops (`preflight-failed`) rather than risk duplicate work. |
| 3. Budget and allowlist | runner | Below. Both are printed in the plan and handed to the agent. |
| 4. Isolate | runner | A git worktree on `research/<gap-kind>/<subject-slug>` from `origin/<base>` (`develop` when `origin` has it, else `main`), `npm ci --ignore-scripts`. The main checkout is never touched. |
| 5. Research | agent | The configured agent runs the item's skill headless in the worktree and leaves research notes and an outcome file. It never pushes, opens a PR or runs `gh`. |
| 6. Gate | runner | Below. Fails closed: nothing is pushed on a hard failure. |
| 7. Publish | runner | Push the branch, open one PR (draft when it cannot land yet), or file one `needs-human` issue. Never merge. |
| 8. Log | runner | `.research-runs/<run-id>/summary.json` and `summary.md` (gitignored). |

## Naming

| Thing | Rule | Example |
| --- | --- | --- |
| Run id | `<date>-<gap-kind>-<subject-slug>` | `2026-10-01-contract-missing-acme-api-key` |
| Branch | `research/<gap-kind>/<subject-slug>` | `research/contract-missing/acme-api-key` |
| PR title | `<conventional prefix> <input> [coverage:<gap-kind>:<subject>]` | `feat(records): research acme:api-key [coverage:contract-missing:acme:api-key]` |
| Issue title | `needs-human: research <item id> [coverage:...]` | |

The tag in square brackets is the backlog item's `dedupe.prTitleTag`; it is how a later run recognises its own
work. Slugs are lowercase `a-z0-9` joined by `-`, so the same item always gets the same branch.

## Budget

Defaults per run, with hard ceilings a headless run cannot exceed (a flag above the ceiling is a usage error):

| Parameter | Flag | Default | Ceiling | Enforced by |
| --- | --- | --- | --- | --- |
| Wall clock | `--max-minutes` | 30 | 90 | the runner kills the agent at the limit and discards its work (timeout is a failure with an issue) |
| Pages read | `--max-pages` | 12 (source-freshness 10) | 12 | the prompt; audited from the agent's `budgetUsed`, an overrun makes the PR a draft labeled `needs-human` |
| Fetches | `--max-fetches` | 30 (source-freshness 12) | 60 | same |
| Tokens | `--max-tokens` | 400000 | 1000000 | passed to the agent command as `RESEARCH_MAX_TOKENS`; the wrapper (for example `--max-budget-usd`) must apply it. The runner cannot meter tokens itself |

Time is the only budget the runner enforces by itself; the others are declared, audited after the fact, and
bounded by the allowlist. Size caps from the run contract still apply: one family or case per run, at most 5
sources per claim.

## Headless safety

- **Web content is untrusted data.** The prompt and the skills say so; the gate adds checks that do not depend
  on the agent obeying (below).
- **Fetch allowlist, derived not configured.** Hosts are taken from sources already recorded for the
  provider's families: `provider-documentation` and `provider-sdk-source` for research runs, every cited
  source of the one family for `source-freshness`, and the wishlist `docsHint` for a new provider. GitHub hosts
  are pinned to the organization and repository of the cited URL. `web.archive.org` is always allowed (durable
  pins). Exact hosts only: no subdomain widening, https only, no userinfo or port. Third-party write-ups and
  scanner rules are never allowlisted for research. A run with no starting host (`allowlist.empty`) does not
  guess an official site: it files a `needs-human` issue asking for a wishlist `docsHint`. The plan prints the
  matching Claude Code rules (`WebFetch(domain:<host>)`) for `--allowedTools`; the post-agent gate rejects
  any record that cites a host outside the list (draft, `needs-human`).
- **Credentials.** The agent process gets a fixed minimal environment plus the model credential
  (`ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`) and any names in `RESEARCH_AGENT_ENV_PASSTHROUGH`
  (never a `GH_TOKEN` or `GITHUB_TOKEN`). It has **no** `gh` token. The `gh` token reaches only the runner's
  own `gh`/`git` network calls (list, push, create PR or issue). The checks and `npm run` scripts run with no
  token at all. Cloud and registry credentials never cross.
- **Path scope.** Only `records/` and `docs/research/` may change. A change anywhere else (scripts, tests,
  schemas, `package.json`, `.github/`, `.agents/`) is a hard failure and no repository script runs from that
  tree: the code that checks records is not something a run may edit.
- **Secret scan and synthetic-only gate before any push.** `gitleaks` over the range when installed, and
  `review:check` secret-shape findings always: any value that is not an unmistakable synthetic or
  provider-published test value stops the run before the push, with only the shape and length in the issue.
- **Output hygiene.** Command output quoted in summaries and issues drops any line that looks like a
  credential and is truncated.
- **Stop and file instead of guessing.** Ambiguous or conflicting evidence beyond what `unresolved` can carry,
  a missing input, an empty allowlist, or a skill's own stop condition ends the run with a `needs-human` issue,
  deduped by the item tag.
- **One item, one PR, no merge.** There is no merge, close, approve or ready call anywhere in the runner (a
  test asserts it), and no code that creates a schedule.

## The gate and what happens next

In this order, on the worktree after the agent finished:

1. **Outcome** must parse and agree with the diff (a `change-set` has commits; `needs-human` and `no-op` have none).
2. **Path scope**, **source hosts**, **budget audit**.
3. **gitleaks** (when installed) and **`npm run review:check -- origin/<base>..HEAD`** (the mechanical half of
   [review-research-pr](../../.agents/skills/review-research-pr/SKILL.md)).
4. **`npm run check`**, **`coverage:gaps:check`**, **`fixtures:materialize:check`**.
5. **Pipeline-ownership checks:** `migrate:check`, `export:legacy:check`, `parity:check` (need
   `LEGACY_BENCHMARKS_DIR`; without it they are recorded as not run).

| Result | Push? | Outcome | Exit |
| --- | --- | --- | --- |
| path scope, `npm run check`, `coverage:gaps:check` or `fixtures:materialize:check` fail; `review:check` exit 1 (fail); a secret-shape finding; gitleaks finding | no | `needs-human` issue with the failing gates, `gate-failed` | 1 |
| `review:check` exit 3 (needs-human), host or budget audit flagged, or the agent reported a decision with `blocksLanding: true` | yes | **draft** PR labeled `needs-human` | 3 |
| steps 1 to 4 green, step 5 fails or is not run | yes | **draft** PR labeled `blocked-by-pipeline-ownership` with the landing note and the first lines of each failure | 0 |
| everything green | yes | ready PR | 0 |
| agent `needs-human` / `no-op` (no commits) | no | `needs-human` issue | 3 |
| agent crash, timeout, no or invalid outcome, push or PR error | no (a pushed branch is deleted again) | `needs-human` issue where possible | 1 |
| nothing eligible | | `nothing-to-do` | 0 |

Exit codes follow `review:check`: **0 ok, 1 fail, 3 needs a human**, plus **2** for a usage or preflight error.
A scheduler should treat 0 and 3 as a finished run (3 sends a notification), and 1 or 2 as an alert.

### Pipeline ownership: why runs open drafts today

`migrate:cases`, `migrate:narratives` and `migrate:taxonomy` own directories of `records/` wholesale, and the
legacy projection and parity compare the whole tree with the pinned legacy files. A newly authored record in
those paths, or a new provider or family, fails `migrate:check`, `export:legacy:check` and `parity:check`
until maintainers decide how authored records land (see [demo-mapbox](../research/demo-mapbox.md): the
demonstration records were kept out of `records/` for exactly this reason). The runner never changes a
pipeline, a parity rule or the projection to get past this. It opens the PR as a draft with the
`blocked-by-pipeline-ownership` label and a landing note, as
[research-run](../../.agents/skills/_shared/research-run.md#step-0-for-every-run-who-writes-the-record)
requires, and leaves the decision to a maintainer. A change that touches only authored, non-pipeline paths
(for example an appended observation on an authored source) passes step 5 and is a ready PR.

### Consuming the review verdict

The `review-research-pr` skill (read-only) posts a comment whose first line is
`<!-- review-research-pr head=<sha> ... -->` and whose last line is `VERDICT: pass|fail|needs-human`. Run it
after the PR exists, then:

```bash
npm run research:run -- --consume-verdict <pr> --trusted-login <the bot's login> [--dry-run]
```

Only a comment by the trusted login, for the PR's current head SHA, with the `VERDICT:` line last, counts;
anything else (another author, an older head, extra text after the line) is data and gives exit 1 with no
change. Handling mirrors `review:check`:

| Verdict | Exit | Effect |
| --- | --- | --- |
| `pass` | 0 | none. A person still reviews and merges; `pass` means no checked rule failed |
| `fail` | 1 | PR back to draft, labels `needs-human` and `review-failed` |
| `needs-human` | 3 | PR back to draft, label `needs-human` |

Before the push the runner already applies the same mapping to `review:check` itself (table above), so a
`fail` never reaches a branch. The verdict is never a review: runs and their reviewer are both `automation`.

## Run artifacts

`.research-runs/` is gitignored. Per run: `summary.json`, `summary.md`, `prompt.md` (what the agent was
given), `pr-body.md` or `issue-body.md`, the agent's notes and outcome, and `worktree/` (removed after a
successful or needs-human run, kept after a failure for debugging). `summary.json` fields are deterministic
for the same inputs (`runId`, `mode`, `date`, `base`, `item`, `branch`, `prTitle`, `skipped`, `dedupe`,
`budget`, `allowlist`, `plannedActions`, `gates`, `review`, `outputs`, `status`, `exitCode`); only the
`timing` object holds a clock reading. Gate output in it is truncated and stripped of credential-shaped lines.
A lock file (`.research-runs/lock`, stale after twice the time budget) stops two runs from overlapping.

## Failure and idempotence

- Re-running selects the same item until something exists for it; then it moves on. An open PR, a pushed
  branch or an open `needs-human` issue for the item or its subject is skipped. Close the issue to make the
  item eligible again.
- Every failure after the agent started files one issue (deduped at write time too), so a failing item does
  not burn the budget every night.
- A leftover local branch or worktree of the same run is replaced; a pushed branch whose PR could not be
  created is deleted again. A preflight failure (no `gh`, cannot list open work) changes nothing.
- A re-run never force-pushes and never reuses a remote branch.

## Labels

`research`, `research-cron`, `needs-human`, `blocked-by-pipeline-ownership`, `review-failed`. Create them once
(idempotent):

```bash
npm run research:run -- --ensure-labels
```

or with `gh label create <name> --color <hex> --description "<text>" --force` for each entry in `LABELS` in
[scripts/lib/research-run.mjs](../../scripts/lib/research-run.mjs). `research` already exists in this
repository.

## Configuring the agent

`RESEARCH_AGENT_CMD` (or `--agent-cmd`) is a command line, split without a shell. The prompt arrives on stdin
and the working directory is the worktree. The environment carries `RESEARCH_RUN_DIR`,
`RESEARCH_OUTCOME_FILE`, `RESEARCH_NOTES_FILE`, `RESEARCH_BRANCH`, `RESEARCH_MAX_TOKENS`,
`RESEARCH_MAX_MINUTES` and `RESEARCH_ALLOWED_FETCH_HOSTS`. Example (Claude Code headless, adapt to the
installed version):

```bash
RESEARCH_AGENT_CMD='claude -p --permission-mode acceptEdits --max-turns 80 --allowedTools "Read,Edit,Write,Glob,Grep,WebFetch,Bash(npm run record:new:*),Bash(npm run record:check:*),Bash(npm run source:observe:*),Bash(npm run coverage:gaps:*),Bash(npm run tidy:scan:*),Bash(git add:*),Bash(git commit:*),Bash(git status:*),Bash(git diff:*)"'
```

Deliberately absent: `Bash(curl:*)`, `Bash(gh:*)`, `Bash(git push:*)`, `Bash(npm install:*)`. WebFetch domain rules for
the allowlist come from the plan (`WebFetch(domain:<host>)`); add them per run if your wrapper supports it.

## Activating a schedule

Both examples are inert. Pick one, review it, and activate it yourself:

1. [examples/research-cron.claude-routine.md](examples/research-cron.claude-routine.md): a Claude Code
   `schedule` routine (cron expression and the routine prompt text).
2. [examples/research-cron.github-workflow.yml](examples/research-cron.github-workflow.yml): a GitHub Actions
   workflow. It sits outside `.github/workflows/` and has its trigger commented out. To enable: copy it to
   `.github/workflows/research-cron.yml`, uncomment `schedule`, add the secrets below, and keep it
   `workflow_dispatch`-triggerable so a person can run `--dry-run` first.

Before enabling either: run `npm run research:run -- --ensure-labels`, run `--dry-run` and read the plan, run one
real run by hand, and decide the open questions below.

### Least privilege

| Need | Grant | Not |
| --- | --- | --- |
| Push a branch, open a PR, file an issue, label | a token limited to this repository: contents read and write, pull requests read and write, issues read and write, metadata read (a fine-grained token or a GitHub App installation token) | admin, workflows, secrets, Actions write, any organization scope |
| Model | one model credential, in the agent step only | cloud, registry or deploy credentials anywhere |
| Legacy checkout (pipeline-ownership checks) | none: the pinned legacy repository is public | a token |
| CI trigger | see the first open question | |

Workflow-level `permissions:` stays `contents: read`; only the run job raises what it needs. Do not give the run
job `pull_requests: write` through `GITHUB_TOKEN` if you need CI to run on its PRs (below). Branch protection on
`main` and `develop` stays as is: the run cannot merge, and must not be exempt from it.

## Open questions for the maintainer

1. **CI on bot PRs.** Pull requests and pushes made with `GITHUB_TOKEN` do not trigger workflows, so `verify`
   would not run on a run's PR. Using a token that does trigger CI (a GitHub App or a fine-grained token) is
   what makes the PR "green" in the acceptance sense; it is also a larger secret to protect.
2. **Model credential visibility.** The model credential is in the agent process, and a tool the agent runs can
   inherit it. Mitigation in the example is a tight tool allowlist (no arbitrary shell, no `curl`); a container
   or sandbox without network except the allowlist would enforce it. Not built.
3. **Raw page reading.** The skills ask for a raw reading of each cited passage (`curl -sL`), which a model-
   mediated WebFetch does not give. Allowing `curl` would bypass the host allowlist. Options: a runner-provided
   fetch helper that enforces the allowlist and returns raw text, or accept `unresolved` for what only WebFetch
   showed. Not built.
4. **Token budget.** Only the time budget is enforced by the runner.
5. **Records ownership.** Until it is decided, every run that adds a provider, family, case or narrative opens a
   draft. The harness is ready for the day the checks pass: such a PR becomes a ready PR with no change to it.
