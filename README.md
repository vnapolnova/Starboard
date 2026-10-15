# Starboard ⭐🦄

Starboard is a family dashboard for the kitchen, inspired by Skylight. It runs full screen on a wall-mounted tablet, and there's a phone companion for planning and editing.

What it does:

- Shows the shared Google Calendar.
- Cleo's picture routine for the day.
- Chores with stickers.
- Grocery list with voice input.
- Meal plan and recipe box.
- Weather.
- Nearby family event suggestions.

## Docs

- [Spec](docs/spec.md): what we're building and every decision so far.
- [Phase 1 plan](docs/phase-1-plan.md): the first build, step by step.
- [CLAUDE.md](CLAUDE.md): context for Claude Code sessions.
- [Pipeline](docs/pipeline.md): how ideas become shipped features (issues, stages and gates).
- [Foundation checklist](docs/foundation-checklist.md): the setup that comes before the pipeline runs.

## Design

Open the interactive mockups in a browser:

- [Kitchen tablet](design/tablet-mockup.html), portrait, about 600×1000.
- [Phone manage](design/phone-mockup.html).

## Stack

- Web app hosted on Firebase Hosting.
- Firestore for data, Firebase Auth with Google sign-in, Cloud Functions.
- Google Calendar API.
- Open-Meteo for weather.
- Fully Kiosk Browser on a Galaxy Tab S6 Lite.

## Develop locally

Needs Node 24.12 or later (the Firebase SDK requires it), Java 21 and `firebase-tools`. Cloud Functions still run on Node 22 (`functions/package.json`).

```sh
npm install && npm --prefix functions install
cp .env.example .env.local   # set VITE_USE_EMULATORS=true to work offline
npm run emulators            # Auth, Firestore, Functions, Hosting; UI at http://localhost:4000
npm run seed                 # in another terminal: seeds the emulator from seed.local.json or seed.example.json
npm run dev
```

- `npm run test:rules` runs the Firestore security rules tests on the emulator.
- `npm run lint`, `npm run format:check` and `npm run build` are the fast checks.

## Status

Design done. Phase 1 foundation (tooling, Firebase, data model) in progress.
