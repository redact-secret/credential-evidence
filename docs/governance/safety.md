# Safety: synthetic material only

This page is the governance statement of the rules in
[SECURITY.md](../../SECURITY.md). If they differ, the stricter one applies and
the difference is a bug to report.

## Rule

Every credential-shaped value in this repository is one of:

1. **Synthetic**: constructed by the author, non-issuable (it uses a prefix or
   body the provider does not issue, or otherwise cannot authenticate), and
   described with how it was built.
2. **Provider-published test value**: a value the provider publishes for
   testing or as a documentation example, with a link to that publication and
   an observed-at date.
3. **Grammar or structural description**: no value at all.

Prefer 3, then 1, then 2.

## Never submit

- a live credential;
- a revoked, expired, or rotated credential that was ever real. Revocation does
  not make a real credential safe to publish;
- a real credential with characters changed ("real-derived");
- a value of unknown origin;
- credentials copied from a third-party incident, breach dump, or public
  repository;
- production or incident logs, customer data, or personal data;
- unsanitized prompt or tool payloads.

A submission that ever contained such a value is not fixed by replacing it in a
later commit, because the value remains in history. Open an issue that describes
the shape in words and do not attach the value. If real material was already
pushed, follow [SECURITY.md](../../SECURITY.md) and do not discuss it publicly.

## Verification

- No one verifies a credential against its provider's live service, in this
  repository or in review, to decide whether it is real. Whether a value is
  live is not a question a contributor answers by testing it.
- A reviewer who suspects a value is real does not reproduce it in a comment.
  They say which file and location, and a maintainer handles it privately.
- Authors state in the pull request how each value was made. A reviewer may
  reject a value whose construction is not stated.

## Scope of this rule

It applies to the case text, fixtures, source excerpts, issue and pull request
bodies, comments, and attachments. It does not depend on what a scanner does
with the value.
