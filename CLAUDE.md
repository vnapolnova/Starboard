# CLAUDE.md: Starboard

Context for Claude Code. Read this first, then `docs/spec.md` (the source of truth) and `docs/phase-1-plan.md` (the current work).

## What this is

Starboard is a family kitchen dashboard for two parents and a toddler.

- **Tablet:** a Galaxy Tab S6 Lite, portrait, full screen in Fully Kiosk Browser.
- **Phone:** a companion layout of the same web app, used for planning, editing, checking things off and undoing changes.

## Ground rules

- **The spec wins.** If code and spec disagree, ask before changing either. Update `docs/spec.md` whenever a decision changes.
- **Match the mockups.** `design/tablet-mockup.html` and `design/phone-mockup.html` define the look: tokens, layout, copy and interactions. Reuse their CSS variables and wording.
- **Keep the tablet simple and safe:**
  - Large tap targets, readable from about 2 m away.
  - No PIN. Instead, use an activity log, a 10-second Undo toast on the tablet, and a "Recent changes" undo list on the phone.
  - Destructive and admin actions (delete, edit recipes, chore setup, settings) are phone-only.
- **No secrets in the repo.** Firebase config goes in env files, and OAuth client secrets and refresh tokens stay server-side only, in Functions config or Secret Manager. Keep `.env*` in `.gitignore`.
- **Family data lives in Firestore, not in code.** That covers names, emails, routines and location. Seed scripts read from a gitignored local file.
- **Accessibility:** visible focus states, respect `prefers-reduced-motion` (the sparkles turn off), and support light and dark themes.

## Key decisions (summary; details in the spec)

- **Data:** Firebase only, including chores. No Google Tasks.
- **Calendar:** one shared "Family" Google Calendar.
  - Ownership order: guests' emails map to people first, then a name or nickname at the start of the title, otherwise Family.
  - Corrections made in the app are stored per event ID in Firestore.
- **Cleo's day:** built in three layers.
  1. Weekday or weekend template.
  2. Today's Cleo events, merged in by time.
  3. One-off changes for today.
  - The current step is the latest step whose start time has passed.
- **Grocery voice:** the tablet mic through the Web Speech API. The Google Hub/Keep sync is a later experiment and not in scope.
- **Screen:** wake at 6:15, dim at 8:45 pm, off at 10 pm, with motion wake handled by Fully Kiosk.
- **Phases:**
  1. Calendar, Today, weather, chores, grocery, Cleo's day.
  2. Meals and recipes with link import, phone Manage screens, Settings.
  3. Event search and Explore.
  - Later: Google Photos slideshow.

## Working style

- Propose a short plan before large changes, and keep commits small and descriptive.
- When something in the spec is ambiguous, ask instead of guessing.
- Test with the Firebase emulators, and check layouts at about 600×1000 portrait and about 390×844 phone size.

## Pipeline (how work flows)

Full details are in `docs/pipeline.md`. The short version:

- **Status lives on the GitHub issue, and content lives in files.** Never write the spec into an issue, and never track status in a file.
- **Stages:** idea → brief → mockup (owner gate) → plan → build → review → ship (owner gate). Labels: `stage:idea`, `stage:brief`, `stage:mockup`, `stage:plan`, `stage:build`, `stage:review`, plus `needs-me` and `manual`.
- **Commands:** `/brief`, `/mockup`, `/plan`, `/build` and `/review`, each taking an issue number. Run one stage per session, on one branch, and open one PR.
- **Feature folders:** `features/NNN-slug/` holds `brief.md`, `mockup-tablet.html`, `mockup-phone.html` and `plan.md`, where NNN is the issue number. Phase 1 issues have no folder; the issue body and `docs/phase-1-plan.md` are the brief.
- **Asking in an unattended session:** if you're blocked or the spec is ambiguous, don't guess. Comment on the issue with a specific question and options, add `needs-me`, and stop. A draft PR with the work so far is fine.
- **GitHub from cloud sessions:** GraphQL is blocked there, so `gh issue view`, `gh pr list/view/create` and `gh label` fail with HTTP 403 (and `gh auth status` wrongly reports a login failure). Use the REST API through `gh api` instead, for example:
  - read: `gh api repos/{owner}/{repo}/issues/N` and `gh api repos/{owner}/{repo}/issues/N/comments`
  - comment: `gh api repos/{owner}/{repo}/issues/N/comments -f body='...'`
  - labels: `gh api repos/{owner}/{repo}/issues/N/labels -f 'labels[]=needs-me'`, and `gh api -X DELETE repos/{owner}/{repo}/issues/N/labels/stage:brief`
  - open a PR: `gh api repos/{owner}/{repo}/pulls -f title='...' -f head=BRANCH -f base=main -F draft=true -F body=@body.md`
  - Only `repos/{owner}/{repo}/...` paths work; `search/...` is blocked, so list PRs with `gh api "repos/{owner}/{repo}/pulls?state=open"`.
  - Or use the GitHub MCP tools (`mcp__github__*`) when they're available.
- **Google Cloud from cloud sessions:** run `scripts/gcloud-login.sh` to sign in as the read-only `claude-readonly` service account (from `GCP_SA_KEY`; never print the key). The session sets a placeholder `CLOUDSDK_AUTH_ACCESS_TOKEN` that overrides that account, so run every later command as `env -u CLOUDSDK_AUTH_ACCESS_TOKEN gcloud ...`.
- **Never start an issue labelled `manual`.** Only the owner can do those, for example billing, OAuth consent or tablet setup.
- **Visual proof:** any PR that changes UI includes screenshots from `scripts/shoot.mjs` (tablet 600×1000 and phone 390×844, light and dark) in `docs/shots/issue-N/`, linked in the PR body next to the matching mockup.
- **Shipping:** a feature PR also updates `docs/spec.md` if anything was decided or changed, and ticks the matching box in the phase plan.
