---
description: Independently review a build PR against brief, mockup and spec
argument-hint: <issue-or-pr-number>
---

Review the PR for #$ARGUMENTS. You didn't write this code, so review it with fresh eyes.

1. Find the PR (`gh api repos/{owner}/{repo}/pulls/$ARGUMENTS`, or list with `gh api "repos/{owner}/{repo}/pulls?state=open"` and match `Closes #$ARGUMENTS` or a branch starting `$ARGUMENTS-`; diff via `gh api repos/{owner}/{repo}/pulls/$ARGUMENTS -H 'Accept: application/vnd.github.diff'`). Read the diff, the PR body, the linked issue, the brief or phase-plan section, the mockups and `CLAUDE.md`.
2. Check each of these, and note where you looked:
   - **Spec:** does it do what the brief or phase plan says, and nothing extra? Are the "Done when" items covered?
   - **Mockup fidelity:** compare the screenshots with the mockup. Check the layout, copy, colors per person, and the light and dark themes.
   - **Tablet safety:** tap targets, legibility from 2 m, no destructive actions on the tablet, and Undo on every write.
   - **Data and security:** writes go through the activity helper, rules are allow-list only, there are no secrets or family data in the repo, and `.env*` isn't committed.
   - **Accessibility:** focus states, reduced motion, contrast.
   - **Tests:** they exist for the logic, they pass (run them), and edge cases like time boundaries are covered.
3. Fix small issues (typos, missing tests, style) yourself, as separate commits on the PR branch.
4. Post one review comment on the PR:
   - **Verdict:** Ready to merge / Needs changes.
   - **Fixed in review:** a list.
   - **Needs a decision:** questions for the owner, if any.
   - **Check on device:** the 1–3 things the owner should look at on the real tablet or phone.
5. Add `needs-me` to the issue. You can't merge.
