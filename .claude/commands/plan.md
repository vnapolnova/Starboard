---
description: Write plan.md for a feature whose mockup was approved
argument-hint: <issue-number>
---

Write the build plan for issue #$ARGUMENTS.

1. Check that the mockup was approved: the mockup PR is approved or merged, or the owner said so on the issue. If it wasn't, comment that on the issue and stop.
2. Read the brief, the approved mockups, `docs/spec.md` (especially the data model in `docs/phase-1-plan.md` §2) and the existing code that the plan will touch.
3. Copy `features/_template/plan.md` into the feature folder and fill it in:
   - Firestore changes, with their effect on the security rules.
   - Tasks small enough for one commit each.
   - Tests: unit tests, emulator tests, and visual checks.
   - Which spec sections to update when it ships.
4. If the build is bigger than about one PR, propose sub-issues in the plan (titles and scope) and ask the owner on the issue before creating them.
5. Fold the approved mockup's visual changes into `design/*-mockup.html` if they change shared screens, in the same PR, so the design files stay the single visual source.
6. Open a PR titled `Plan: <feature> (#$ARGUMENTS)` and move the issue to `stage:build`.
