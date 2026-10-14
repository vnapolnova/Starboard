# Foundation checklist (before the pipeline runs)

Phase 1 plan steps 0–2 are done directly, in two or three attended sessions, because everything else builds on them. 👤 marks steps only the owner can do. 🤖 marks steps for a cloud session that you watch.

## A. Repo on GitHub (👤, about 15 min)

- [x] Make the first commits and push to `origin main`.
- [x] Install the [GitHub CLI](https://cli.github.com) and run `gh auth login`.
- [x] Commit and push the `.claude/commands/` folder.
- [x] Done: labels and Phase 1 issues created on GitHub
- [x] Done: GitHub Project for the repo, with issues and PRs auto-added and saved views filtered by the `stage:*` labels, plus a `label:needs-me` inbox. Labels stay the source of truth; sessions never edit the project, since cloud sessions can't reach the Projects API.
- [x] Done: repo connected in Claude Code on the web, with `api.open-meteo.com` and `geocoding-api.open-meteo.com` under Allowed domains (npm and Google/Firebase hosts already work). Java 21 is preinstalled. `gh` works in sessions through `gh api` REST calls only (GraphQL is blocked; see `CLAUDE.md`).

## B. Session 1: tooling (plan §0) 🤖 + 👤

- [ ] 👤 **Decide the front end.** This is the plan's open question. My suggestion is **Vite + Preact + TypeScript**: it's still lightweight, and components help with the six screens and the shared shell. Vanilla TypeScript is fine if you want zero framework. Record the choice in `docs/spec.md` §1.
- [ ] 🤖 Scaffold Vite, the linter and formatter, and a `.env.example`. Port the design tokens from `design/tablet-mockup.html` into a shared stylesheet.
- [ ] 🤖 Add Playwright as a dev dependency pinned to `playwright@1.56.1`, and an `npm run shoot` alias for `scripts/shoot.mjs`. Check it on `design/tablet-mockup.html`. Cloud sessions already have the matching Chromium in `/opt/pw-browsers`, so don't run `npx playwright install` there; if you bump the version, the preinstalled browser won't match.

## C. Firebase project (plan §1) 👤

- [ ] Create the Firebase project. Enable Auth with Google sign-in, Firestore and Hosting.
- [ ] Upgrade to the Blaze plan.
- [ ] Run `firebase init` in Session 2 (below), then run `firebase init hosting:github`:
  - It creates a service account and a repo secret named something like `FIREBASE_SERVICE_ACCOUNT_<PROJECT>`.
  - **Delete the two workflow files it generates.** This repo already has `preview.yml` and `deploy.yml`.
  - In the repo's Settings → Variables, set `FIREBASE_PROJECT_ID` and set `FIREBASE_SA_SECRET` to the secret's exact name.
- [ ] Do issue "Manual: Calendar OAuth consent", whenever suits you. It only blocks the calendar going live.

## D. Session 2: Firebase + data model (plan §1–2) 🤖

- [ ] 👤 Before this session, add `npm install -g firebase-tools` to the environment's setup script (cloud environment menu → Edit → Setup script). Optionally also `firebase setup:emulators:firestore` and `firebase setup:emulators:ui` to pre-download the emulators.
- [ ] `firebase init` for Hosting (public dir `dist`, SPA rewrite), Firestore, Functions and the emulators.
- [ ] Security rules: only allow-listed household accounts can read or write. Add rules tests in the emulator.
- [ ] Add the data-model types and Firestore helpers for the collections in plan §2.
- [ ] A seed script that reads `seed.local.json` (gitignored), with a committed `seed.example.json` that uses placeholder names.
- [ ] Open a PR. Check that `preview.yml` posts a working preview URL, and that `/_mockups/design/tablet-mockup.html` loads.

## E. Pipeline on

Once the preview URL works, run issues with `/build N` in cloud sessions:

1. **In parallel:** Activity log + Undo, and the App shell (Calendar sync can also start any time).
2. **In parallel:** Weather, Today, Calendar week, Chores, Grocery, Cleo's day.
3. **Then:** Phone companion.
4. 👤 **Then:** Fully Kiosk setup + acceptance.

Run the **pilot idea** through `/brief` → `/mockup` at any point to try out the mockup gate.
