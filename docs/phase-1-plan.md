# Phase 1 plan

**Goal:** the kitchen tablet shows a live Today screen, the week calendar, chores, the grocery list and Cleo's day, backed by Firebase and the Family Google Calendar. Phones can check off chores and groceries and undo changes.

**Out of scope for Phase 1:** meals and recipes, the phone Manage editors (chores and the routine are set up with a seed script for now), event search and Explore, and the Photos slideshow.

## 0. Repo and tooling

- [x] Choose a lightweight front end: **Vite + Preact + TypeScript** (owner confirmed; see `docs/spec.md` §1).
- [x] Add a linter, a formatter and a `.gitignore` that covers `.env*`, `seed.local.json` and `node_modules`.
- [ ] Run `firebase init` for Hosting, Firestore, Functions and the emulators.
- [x] Port the design tokens (colors, fonts, spacing) from `design/tablet-mockup.html` into a shared stylesheet.

## 1. Firebase project

- [ ] Create the Firebase project and enable Auth with the Google provider, plus Firestore and Hosting.
- [ ] Upgrade to the Blaze plan. Cloud Functions that call Google APIs require it, and normal family use should stay within the free tier.
- [ ] Write security rules: only allow-listed household accounts can read and write. The tablet signs in once with a household Google account.

## 2. Data model (Firestore)

```
households/{hid}
  members/{memberId}        name, color, emails[], nicknames[], isKid
  settings/main             weather {place, lat, lon, unit}, screen {wake, dim, off}
  events/{eventId}          mirrored from Google Calendar: title, start, end, ownerIds[], ownerSource
  eventOverrides/{eventId}  ownerIds[] (manual correction), special: bool, pic
  chores/{choreId}          name, memberId, repeat (daily|weekdays|weekly|once), pic
  choreCompletions/{date_choreId}  doneAt, doneBy
  grocery/{itemId}          name, category, source, done, addedAt
  routines/{weekday|weekend} steps[] {name, pic, start}
  routineOverrides/{date}   steps[] (one-off changes for that day)
  stickers/{memberId}       monthly counts
  activity/{logId}          ts, actor/device, action, before, after, undone
```

- [ ] Write a seed script that reads `seed.local.json` (gitignored) and creates the members, chores and both routines.

## 3. Calendar sync (Cloud Function)

- [ ] Do a one-time OAuth consent for the Family calendar with the `calendar.readonly` scope, storing the refresh token in Secret Manager.
- [ ] Add a scheduled function, every 5 minutes, that:
  - fetches the next 14 days of events,
  - works out the owner(s): guest emails first, then a name or nickname at the start of the title, otherwise Family,
  - writes the results to `events`.
- [ ] Apply `eventOverrides` on read in the client.
- [ ] Write unit tests for the owner detection, including that a name in the middle of the title doesn't match.

## 4. Weather

- [ ] Fetch from Open-Meteo on the client (no API key) using the lat/lon from settings. Refresh every 30 minutes and cache the last result.
- [ ] Support the °F/°C unit from settings. The phone Settings screen comes in Phase 2; seed the location for now.

## 5. Tablet screens

- [ ] **App shell:** header (clock, date, weather, person chips, unicorn) and bottom tabs.
- [ ] **Today:**
  - agenda with a "Now" line and past events dimmed,
  - chores preview,
  - grocery strip with mic,
  - dinner card as a placeholder until Phase 2.
- [ ] **Calendar:** week view, with the person filters applied.
- [ ] **Chores:**
  - columns per person, with daily reset based on `choreCompletions` dates,
  - stars for adults and stickers for Cleo,
  - the sparkle burst when Cleo's chores are done.
- [ ] **Grocery:**
  - add by typing or voice through the Web Speech API (parse "add X"),
  - categories, an "In the cart" section and source tags.
- [ ] **Cleo's day:**
  - merge the template, today's Cleo events and the day's overrides,
  - highlight the current step,
  - Weekday/Weekend toggle,
  - "N sleeps until" countdown for the next event marked special.
- [ ] **Real-time:** all screens subscribe to Firestore with `onSnapshot`.

## 6. Activity log and undo

- [ ] Route every write through a single helper that also writes to `activity` (before and after values).
- [ ] Tablet: show an Undo toast for 10 seconds after each change.
- [ ] Phone: a minimal "Recent changes" list with undo, plus check-off for chores and groceries.

## 7. Tablet setup

- [ ] Deploy to Firebase Hosting.
- [ ] Configure Fully Kiosk:
  - start URL, kiosk mode, autostart on boot,
  - wake at 6:15, dim at 8:45 pm, screen off at 10 pm,
  - motion detection for wake,
  - allow microphone access.
- [ ] Test on the Tab S6 Lite in portrait: tap targets, readability from about 2 m, performance.

## Done when

- [ ] An event added to the Family calendar shows up on the tablet within 5 minutes, colored for the right person.
- [ ] A chore checked off on the tablet appears on a phone within seconds, and the Undo works.
- [ ] Cleo's day shows the right current step on a weekday and on a weekend.
- [ ] Saying "add milk" adds milk to the grocery list.
- [ ] The tablet follows its wake and sleep schedule on its own.
