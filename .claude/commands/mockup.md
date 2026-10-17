---
description: Build tablet and phone HTML mockups for a feature, ready for the owner's visual review
argument-hint: <issue-number>
---

Build the mockups for issue #$ARGUMENTS. This stage is the owner's visual gate, so polish matters.

1. Read the issue and comments (`gh api repos/{owner}/{repo}/issues/$ARGUMENTS` and `.../issues/$ARGUMENTS/comments`), `features/<NNN>-*/brief.md`, `CLAUDE.md`, and both `design/tablet-mockup.html` and `design/phone-mockup.html` in full.
2. Work on the feature branch, or create `$ARGUMENTS-<slug>`. If this is a revision, read the PR review comments first and address each one.
3. Create `mockup-tablet.html` and/or `mockup-phone.html` in the feature folder, depending on the surfaces in the brief:
   - Start from a **copy** of the matching design mockup, so the tokens, fonts, header, tabs and tone stay identical. Change only what the feature needs, and keep the surrounding screen so it's shown in context.
   - Keep each mockup self-contained: one file with inline CSS and JS, and no build step.
   - Make it interactive enough to judge the feel: real taps, sheets opening, the Undo toast, and realistic sample data using the placeholder names (Alice, Bob, Cleo).
   - Show the states that matter: empty, busy or long-text, and light and dark themes. Respect `prefers-reduced-motion`.
   - Tablet: large tap targets, readable from about 2 m, at 600×1000 portrait. Phone: 390×844.
4. Take screenshots with `node scripts/shoot.mjs features/<folder>/mockup-tablet.html issue-$ARGUMENTS` (and the same for the phone file). If Playwright isn't installed yet, skip this and say so in the PR.
5. Open or update a PR titled `Mockup: <feature> (#$ARGUMENTS)`. The PR body should include:
   - the preview links (`/_mockups/features/<folder>/mockup-tablet.html`; the bot comments the base URL),
   - the screenshots, as Markdown images pinned to the pushed commit (`![name](https://raw.githubusercontent.com/{owner}/{repo}/<sha>/docs/shots/...)`), never `<img>` tags (see `docs/pipeline.md`),
   - a short list of the design decisions you made and the questions for the owner.
6. Labels: keep `stage:mockup` and add `needs-me`.

Don't write app code. Don't edit `design/*-mockup.html`; those files only change after the owner approves.
