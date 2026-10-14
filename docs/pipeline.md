# Pipeline

How an idea becomes a shipped Starboard feature. The owner works on ideas and briefs in Cowork, and cloud Claude Code sessions do everything else on the GitHub repo. Two steps are gates where the owner decides: approving the mockup and merging the build.

## The rule

**Status lives on the GitHub issue, and content lives in files.**

- **An issue is the card.** It has a title, a stage label and links. The board (GitHub Projects) shows where everything is.
- **Files are the substance.** The brief, mockups and plan sit in `features/NNN-slug/`, versioned with the code, so every session can read them.

## Stages

| # | Stage | Where | Output | Label when done |
|---|---|---|---|---|
| 1 | Idea | Cowork | An issue from the *Feature idea* template | `stage:idea` |
| 2 | Brief | Cowork or `/brief N` | `features/NNN-slug/brief.md` | `stage:mockup` |
| 3 | Mockup | `/mockup N` (cloud) | `mockup-tablet.html` and `mockup-phone.html`, in a PR with a preview URL | `stage:mockup` + `needs-me` |
| ⛳ | **Gate: mockup** | You | Approve the PR, or comment with changes | `stage:plan` |
| 4 | Plan | `/plan N` (cloud) | `plan.md`: tasks, Firestore changes, tests | `stage:build` |
| 5 | Build | `/build N` (cloud) | A code PR (`Closes #N`) with screenshots | `stage:review` |
| 6 | Review | `/review N` (a fresh cloud session) | Review comments, fixes and a verdict | `needs-me` |
| ⛳ | **Gate: ship** | You | Merge. The issue closes and the spec is updated. | — |

Stage 2 can be skipped for tiny changes. Stages 3 and 4 can share one PR when the plan is small. Large builds can be split into several build issues that link back to the feature issue.

## Labels

| Label | Meaning |
|---|---|
| `stage:idea`, `stage:brief`, `stage:mockup`, `stage:plan`, `stage:build`, `stage:review` | Where the issue is. Only one at a time. |
| `needs-me` | Waiting on the owner: an approval, a question or a merge. This is the owner's inbox. |
| `manual` | Only the owner can do it (billing, OAuth consent, devices). Sessions never pick these up. |
| `phase-1`, `phase-2`, `phase-3` | Roadmap grouping. |

## Visual review

The owner reviews by looking at the result, not by reading code.

- **Mockups** are self-contained HTML. Each one starts as a copy of `design/tablet-mockup.html` or `design/phone-mockup.html` so it keeps the tokens, fonts and wording, and changes only what the feature needs.
- **Preview URLs:** `.github/workflows/preview.yml` deploys every PR to a Firebase Hosting preview channel and comments the link on the PR. Mockups are served under `/_mockups/`. Open the link on a phone, or on the tablet itself.
- **Screenshots:** UI PRs include output from `scripts/shoot.mjs` at 600×1000 (tablet) and 390×844 (phone), in light and dark, committed to `docs/shots/issue-N/` and linked in the PR body.

## Running a session

In a cloud Claude Code session on the repo:

```
/build 14
```

Each command reads the issue (with `gh api` REST calls; see `CLAUDE.md`), the relevant files and `CLAUDE.md`. It works on a branch called `N-slug`, opens or updates one PR, moves the label and stops. A blocked session comments on the issue, adds `needs-me` and stops.

You can run several sessions in parallel as long as their issues don't touch the same files. A dependency is noted in the issue as `Depends on #N`.

## Phase 1 exception

Phase 1 was specced and mocked up before this pipeline existed.

- **Foundation (plan steps 0–2):** done directly in a few attended sessions. See `docs/foundation-checklist.md`.
- **Steps 3–7:** issues start at `stage:build`. The brief is the issue body plus `docs/phase-1-plan.md`, and the approved mockups are in `design/`.
- **Pilot:** one small new idea goes through every stage during Phase 1, to test the flow, including the mockup gate.
