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

- [x] 👤 **Decide the front end.** Decided: **Vite + Preact + TypeScript**, recorded in `docs/spec.md` §1. The suggestion was **Vite + Preact + TypeScript**: it's still lightweight, and components help with the six screens and the shared shell. Vanilla TypeScript is fine if you want zero framework. Record the choice in `docs/spec.md` §1.
- [x] 🤖 Scaffold Vite, the linter and formatter, and a `.env.example`. Port the design tokens from `design/tablet-mockup.html` into a shared stylesheet.
- [x] 🤖 Add Playwright as a dev dependency pinned to `playwright@1.56.1`, and an `npm run shoot` alias for `scripts/shoot.mjs`. Check it on `design/tablet-mockup.html`. Cloud sessions already have the matching Chromium in `/opt/pw-browsers`, so don't run `npx playwright install` there; if you bump the version, the preinstalled browser won't match.

## C. Firebase project (plan §1) 👤

- [x] Create the Firebase project (`starboard-family`). Enable Auth with Google sign-in, Firestore and Hosting.
- [x] Upgrade to the Blaze plan.
- [x] Register a web app (Project settings → Your apps) and copy its config into a local `.env.local` (keys as in `.env.example`).
- [x] Run `firebase init hosting` (done by hand: public dir `dist`, SPA rewrite), then `firebase init hosting:github`:
  - It creates a service account and a repo secret named something like `FIREBASE_SERVICE_ACCOUNT_<PROJECT>`.
  - **Delete the two workflow files it generates.** This repo already has `preview.yml` and `deploy.yml`.
  - In the repo's Settings → Variables, set `FIREBASE_PROJECT_ID` and set `FIREBASE_SA_SECRET` to the secret's exact name.
- [ ] Let CI deploy Cloud Functions (`.github/workflows/deploy-functions.yml`, which runs on pushes to `main` that touch `functions/`, or by hand from the Actions tab). It uses the same service account as `deploy.yml`, which only has Hosting roles. In Google Cloud console → IAM, give that account (`github-action-…@starboard-family.iam.gserviceaccount.com`) these roles:
  - Cloud Functions Admin, Cloud Run Admin, Cloud Scheduler Admin and Artifact Registry Administrator, to create the scheduled function.
  - Service Account User, so the function can run as the default compute service account.
  - Secret Manager Viewer, so the deploy can check the `GCAL_*` secrets and pin their versions.
  - Service Usage Admin, so the first deploy can turn on the APIs it needs. After that first deploy, Service Usage Consumer is enough.

  Or from a terminal, with `SA` set to the account's email:
  ```
  for r in cloudfunctions.admin run.admin cloudscheduler.admin artifactregistry.admin \
           iam.serviceAccountUser secretmanager.viewer serviceusage.serviceUsageAdmin; do
    gcloud projects add-iam-policy-binding starboard-family --member "serviceAccount:$SA" --role "roles/$r"
  done
  ```
  Also, once, on each of the three `GCAL_*` secrets in Secret Manager, give the function's runtime account (`<project-number>-compute@developer.gserviceaccount.com`) **Secret Manager Secret Accessor**. Then the deploy has no secret permissions to change, so the GitHub account doesn't need Secret Manager Admin.
  ```
  for s in GCAL_CLIENT_ID GCAL_CLIENT_SECRET GCAL_REFRESH_TOKEN; do
    gcloud secrets add-iam-policy-binding $s --project starboard-family \
      --member "serviceAccount:$(gcloud projects describe starboard-family --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
      --role roles/secretmanager.secretAccessor
  done
  ```
  Then merge, or run **Deploy functions** from the Actions tab.
- [ ] Do issue "Manual: Calendar OAuth consent", whenever suits you. It only blocks the calendar going live.

## D. Session 2: Firebase + data model (plan §1–2) 🤖

- [x] 👤 Done: `npm install -g firebase-tools` is in the environment's setup script (cloud environment menu → Edit → Setup script). Optionally also `firebase setup:emulators:firestore` and `firebase setup:emulators:ui` to pre-download the emulators.
- [x] `firebase init` for Firestore, Functions and the emulators. Hosting is already set up in `firebase.json`.
- [x] Security rules: only allow-listed household accounts can read or write. Add rules tests in the emulator (`npm run test:rules`).
- [x] Add the data-model types and Firestore helpers for the collections in plan §2 (`src/data/`).
- [x] A seed script that reads `seed.local.json` (gitignored), with a committed `seed.example.json` that uses placeholder names (`npm run seed`).
- [x] 🤖 Pass the Firebase web config to CI builds: `preview.yml` and `deploy.yml` expose the six `VITE_FIREBASE_*` repo variables to `npm run build` (the config isn't secret).
- [ ] 👤 Add the six `VITE_FIREBASE_*` values from `.env.local` as repo variables (Settings → Secrets and variables → Actions → Variables).
- [x] Google sign-in on preview channels: decided, previews are for visual review only; sign-in is tested on the emulators and the live URL (spec §1, Previews).
- [ ] Open a PR. Check that `preview.yml` posts a working preview URL, and that `/_mockups/design/tablet-mockup.html` loads.
- [x] 👤 Copy `seed.example.json` to `seed.local.json`, fill in the real family, the tablet's account and the location, then run `npm run seed -- --prod` (after `gcloud auth application-default login`). Deploy the rules with `firebase deploy --only firestore`.

## E. Pipeline on

Once the preview URL works, run issues with `/build N` in cloud sessions:

1. **In parallel:** Activity log + Undo, and the App shell (Calendar sync can also start any time).
2. **In parallel:** Weather, Today, Calendar week, Chores, Grocery, Cleo's day.
3. **Then:** Phone companion.
4. 👤 **Then:** Fully Kiosk setup + acceptance.

Run the **pilot idea** through `/brief` → `/mockup` at any point to try out the mockup gate.
