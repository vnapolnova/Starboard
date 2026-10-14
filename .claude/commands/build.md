---
description: Implement a stage:build issue on a branch and open a PR with tests and screenshots
argument-hint: <issue-number>
---

Implement issue #$ARGUMENTS.

1. Read the issue and comments (`gh api repos/{owner}/{repo}/issues/$ARGUMENTS` and `.../issues/$ARGUMENTS/comments`).
   - Stop at once if the issue is labelled `manual` or `needs-me`, or if a `Depends on #N` issue is still open. Comment why.
2. Read `CLAUDE.md`, the relevant parts of `docs/spec.md`, and either:
   - the feature folder (`brief.md`, the approved mockups, `plan.md`), or
   - for Phase 1, the issue body, the matching section of `docs/phase-1-plan.md`, and the matching screen in `design/*-mockup.html`.
3. Create the branch `$ARGUMENTS-<slug>` from `main`. Before the first commit, post a short plan (5–10 bullets) as a comment on the issue. Then go ahead without waiting.
4. Build it:
   - **Look and copy:** reuse the shared tokens and stylesheet, and match the mockup's layout, copy and interactions.
   - **Writes:** every user write goes through the activity-log helper, and Undo has to work.
   - **Tablet safety:** no destructive actions on the tablet.
   - **Tests:** write unit tests for any logic, and run them along with the emulator tests. Fix failures before opening the PR.
   - **Commits:** small and descriptive.
5. If the change touches UI, run the app and capture it: `node scripts/shoot.mjs <url> issue-$ARGUMENTS`. Commit the results to `docs/shots/issue-$ARGUMENTS/`.
6. Open a PR titled `<Feature> (#$ARGUMENTS)` from `.github/pull_request_template.md`, with `Closes #$ARGUMENTS`. Fill in every section, including putting the screenshots next to the matching mockup.
7. Move the issue to `stage:review`.

If something's ambiguous or the spec conflicts with the mockup, stop and ask:
- Comment the question with 2–3 options and your recommendation.
- Add `needs-me`.
- Push what you have as a draft PR.
