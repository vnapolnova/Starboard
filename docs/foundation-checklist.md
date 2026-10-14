# Foundation checklist (before the pipeline runs)

Phase 1 plan steps 0–2 are done directly, in two or three attended sessions, because everything else builds on them. 👤 marks steps only the owner can do. 🤖 marks steps for a cloud session that you watch.

## A. Repo on GitHub (👤, about 15 min)

- [ ] Make the first commit and push from your machine:
  `git add -A && git commit -m "Spec, mockups and pipeline scaffolding" && git push -u origin main`
- [ ] Install the [GitHub CLI](https://cli.github.com), run `gh auth login`, then run
  `powershell -File setup/bootstrap-github.ps1`. It installs the slash commands, creates the labels and opens the Phase 1 issues.
- [ ] Commit and push the new `.claude/commands/` folder.
- [ ] Delete `setup/` (backlog drafts and staged commands) once the issues exist, so the issues are the only copy. Git history keeps the drafts if you ever need them.
- [ ] Optional: create a GitHub Project board for the repo, with columns grouped by the `stage:*` labels, and a saved filter `label:needs-me` as your inbox.
- [ ] Connect the repo in Claude Code on the web. In the environment settings, allow network access for npm and Firebase, and add Java 17+ to the setup script so the Firestore emulator runs. Check whether `gh` works in a session. If it doesn't, sessions will ask you to paste issue text.

## B. Session 1: tooling (plan §0) 🤖 + 👤

- [ ] 👤 **Decide the front end.** This is the plan's open question. My suggestion is **Vite + Preact + TypeScript**: it's still lightweight, and components help with the six screens and the shared shell. Vanilla TypeScript is fine if you want zero framework. Record the choice in `docs/spec.md` §1.
- [ ] 🤖 Scaffold Vite, the linter and formatter, and a `.env.example`. Port the design tokens from `design/tablet-mockup.html` into a shared stylesheet.
- [ ] 🤖 Add Playwright as a dev dependency and an `npm run shoot` alias for `scripts/shoot.mjs`. Check it on `design/tablet-mockup.html`.

## C. Firebase project (plan §1) 👤

- [ ] Create the Firebase project. Enable Auth with Google sign-in, Firestore and Hosting.
- [ ] Upgrade to the Blaze plan.
- [ ] Run `firebase init` in Session 2 (below), then run `firebase init hosting:github`:
  - It creates a service account and a repo secret named something like `FIREBASE_SERVICE_ACCOUNT_<PROJECT>`.
  - **Delete the two workflow files it generates.** This repo already has `preview.yml` and `deploy.yml`.
  - In the repo's Settings → Variables, set `FIREBASE_PROJECT_ID` and set `FIREBASE_SA_SECRET` to the secret's exact name.
- [ ] Do issue "Manual: Calendar OAuth consent", whenever suits you. It only blocks the calendar going live.

## D. Session 2: Firebase + data model (plan §1–2) 🤖

- [ ] `firebase init` for Hosting (public dir `dist`, SPA rewrite), Firestore, Functions and the emulators.
- [ ] Security rules: only allow-listed household accounts can read or write. Add rules tests in the emulator.
- [ ] Add the data-model types and Firestore helpers for the collections in plan §2.
- [ ] A seed script that reads `seed.local.json` (gitignored), with a committed `seed.example.json` that uses placeholder names.
- [ ] Open a PR. Check that `preview.yml` posts a working preview URL, and that `/_mockups/design/tablet-mockup.html` loads.

## E. Pipeline on

Once the preview URL works, run issues with `/build N` in cloud sessions:

1. **In parallel:** Activity log + Undo, and the App shell (Calendar sync can also start any time).
2. **In parallel:** Weather, Today, Calendar week, Chores, Grocery, Kid's day.
3. **Then:** Phone companion.
4. 👤 **Then:** Fully Kiosk setup + acceptance.

Run the **pilot idea** through `/brief` → `/mockup` at any point to try out the mockup gate.
