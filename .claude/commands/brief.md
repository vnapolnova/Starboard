---
description: Turn a feature idea issue into features/NNN-slug/brief.md
argument-hint: <issue-number>
---

Write the brief for issue #$ARGUMENTS. Follow `docs/pipeline.md`.

1. Read the issue and its comments (`gh api repos/{owner}/{repo}/issues/$ARGUMENTS` and `.../issues/$ARGUMENTS/comments`; see "GitHub from cloud sessions" in `CLAUDE.md`). If neither `gh api` nor the GitHub MCP tools work, ask the owner to paste the issue and stop. Read `CLAUDE.md` and `docs/spec.md`.
2. Create the branch `$ARGUMENTS-<slug>` and the folder `features/<NNN>-<slug>/`, with NNN as the zero-padded issue number. Copy `features/_template/brief.md` into it.
3. Fill in the brief. Keep it short and concrete, and use the spec's wording for screens and the placeholder names (Alice, Bob, Cleo) for people.
   - Check it against the spec's ground rules: toddler safety, phone-only admin actions, and no family data in code.
   - Note any part that conflicts with `docs/spec.md` under **Open questions**. Don't resolve it yourself.
4. Commit, push and open a PR titled `Brief: <feature> (#$ARGUMENTS)`.
5. Labels:
   - If **Open questions** is not empty, comment those questions on the issue, add `needs-me` and keep `stage:brief`.
   - Otherwise, move the issue to `stage:mockup`.

Don't write mockups or code in this session.
