# Starboard: Spec v2

Starboard is a Skylight-style family dashboard for the kitchen, with a phone companion for planning and editing.

- **Repo:** https://github.com/vnapolnova/Starboard
- **Tablet mockup:** `design/tablet-mockup.html`
- **Phone mockup:** `design/phone-mockup.html`

## 1. Platform

| | |
|---|---|
| Display | Samsung Galaxy Tab S6 Lite, portrait, full screen in Fully Kiosk Browser |
| App | Web app (same code base for the tablet and phone layouts) |
| Front end | Vite + Preact + TypeScript. Preact keeps the bundle small for the tablet, and components handle the shared shell, the six screens and live Firestore updates. ESLint + Prettier; design tokens in `src/styles/tokens.css`, with the same variable names as the mockups, plus named spacing (`--space-1…6`) and radius (`--radius-sm/--radius/--radius-lg/--radius-pill`) tokens. |
| Hosting | Firebase Hosting |
| Access | Only allow-listed Google accounts can sign in: the parents and the tablet's household account. The list is `allowedEmails` on the `households/{hid}` doc, set by the seed script and never editable from the app. Firestore rules enforce it, and keep calendar events read-only and the activity log undeletable. Phone-only actions are a UI rule, since every device signs in with an allow-listed account. |
| Previews | PR preview channels are for visual review only: the signed-out screen and `/_mockups/`. Their URLs aren't authorized for Google sign-in, so sign-in and data are tested on the emulators locally and on the live URL after merge. |
| Data | Firebase (Firestore with real-time sync, Auth with Google sign-in, Cloud Functions) |
| Calendar | Google Calendar API, using the shared "Family" calendar |
| Screen schedule | Wake at 6:15, dim at 7:45 pm, off at 9 pm. Motion wake through Fully Kiosk's camera. |

## 2. Family

| Person | Color | Notes |
|---|---|---|
| Alice | Blue | Parent |
| Bob | Teal | Parent |
| Cleo | Purple | The kid (a toddler). Has their own Google account. |
| Family | Amber | Shared events |

Alice, Bob and Cleo are placeholder names used in this spec, the mockups and the issues. The app reads real names from Firestore (`members`), so "Cleo's day" and "Cleo's pick" show the kid's actual name.

Header chips toggle each person's events on and off in the Today and Calendar views. The chips come from `members` (parents, then the kid, by color slot) plus a fixed Family chip. Filters are view state on that device: they carry across tabs, aren't saved to Firestore, and reset to all-on on reload.

## 3. Look & feel

- **Palette:** purple, with a starry night-sky header.
- **Mascot:** an original unicorn in the header. Tapping it opens Cleo's day.
- **Playful details:** a rainbow "Now" line, and a sparkle burst plus a sticker when one of Cleo's chores is done.
- **Fonts:** Baloo 2 for display text and Atkinson Hyperlegible for body text.
- **Themes:** light and dark. Motion respects reduced-motion settings.
- **Fun level:** the same look all day. A calmer look for nights or mornings can come later.

## 4. Tablet screens

Tabs: Today · Calendar · Meals · Grocery · Chores, plus Cleo's day (opened from the unicorn) and Explore (opened from the Nearby card).

On a phone-sized screen (≤520px wide) the same shell uses the phone mockup's compact bar: the section title, the signed-in person's name, a small unicorn, and the person chips beneath. The chips keep their tablet size and wrap onto a second row when the names don't fit, so tap targets never shrink. The big clock and weather are tablet-only.

### Today

- **Header:** clock, date, weather (current temperature plus high and low), person chips and the unicorn.
  - Weather comes from Open-Meteo on the tablet (no API key), using `settings/main.weather`. It shows a sky icon, the current temperature, today's high and low, and the town (the part of `place` before the comma). It refreshes every 30 minutes, always fetches in °C and converts to the unit from settings, so changing the unit needs no refetch. The last reading is cached on the device: offline it keeps showing, and with nothing cached the slot stays empty. It never shows an error.
- **Agenda:** today's events with a color bar per person, the "Now" line, and past events dimmed.
  - It lists every event that overlaps today, in local time. All-day events come first, labelled "All day", and are never dimmed. A timed event carried over from yesterday shows "Until 2:00".
  - The color bar is the owner's color. An event with several owners gets equal stripes, one per owner, and an event with no owners is Family. The line under the title names the owners ("Alice & Cleo").
  - An event dims once its end time has passed. The "Now" line sits before the first event that hasn't started, and both follow the clock minute by minute.
  - The person chips filter the agenda: an event shows if any of its owners is on.
  - Once nothing is left to come, one line closes the list: "That's everything today." (or "Nothing on the calendar today."), plus "Tomorrow starts with Gym at 7:00." when tomorrow has a timed event.
- **Dinner tonight:** the planned meal and a suggested start time, with a link to the recipe. Until Phase 2 it's a placeholder card, with **Week** opening Meals.
- **Chores today:** the first four chores due today, not-done first, then parents before the kid. **All** opens Chores. A tap checks a chore off for today, or un-checks it, with a short message and no Undo (see Chores).
- **Grocery:** count, a short preview (the first five items still to buy, oldest first, then "and N more") and a mic button. **Open** opens Grocery. Until voice add lands, the mic opens the Grocery tab too.
- **Nearby this week:** 4–6 ranked suggestions, plus **See more**, which opens Explore.

### Cleo's day

A picture routine with a **Weekday / Weekend** toggle.

- **Current step:** the latest step whose start time has passed (a step starting at 8:00 is current from 8:00 exactly). It gets a rainbow border and "Right now", and earlier steps fade with a ✓. Before the first step nothing is highlighted; after bedtime, Bedtime stays current. The highlight, today's events and today's one-off changes only show on the routine that matches today (Saturday and Sunday are weekend); the other toggle shows the plain template.
- **Countdown:** "N sleeps until…" the next Cleo or Family event marked as special, on a later day than today. N counts calendar days, with one moon per sleep (up to 10). The card is hidden when nothing special is coming.

| Time | Weekday | Weekend |
|---|---|---|
| 6:30 | ☀️ Wake up | ☀️ Wake up |
| 7:00 | 🥣 Breakfast | 🥣 Breakfast |
| 7:45 | 🪥 Teeth & get ready | |
| 8:00 | 🎨 Daycare | |
| 11:00 | | 🥪 Lunch |
| 12:15–2:00 | | 😴 Nap |
| 2:00 | | 🧸 Up from nap |
| 4:00 | 🚗 Pickup | |
| 5:00 | 🌮 Dinner | 🌮 Dinner |
| 7:00 | 🍎 Snack | 🍎 Snack |
| 7:30 | 🛁 Bath | 🛁 Bath |
| 8:20 | 🌙 Bedtime | 🌙 Bedtime |

How the routine is built each day:

1. Start from the routine template for the day type. Templates are stored in Firebase and edited on the phone.
   - A step lasts until its optional end time (the nap: 12:15–2:00) or else until the next step starts. The last step lasts until midnight.
2. Merge in today's timed calendar events that involve Cleo (she's one of the owners), placed by time. All-day events aren't placed.
   - Each event gets a picture: picked when the event is edited, else matched from words in the title, else 📅.
   - A leading "Cleo –" or "Cleo:" (name or nickname) is dropped from the step name.
   - An event that overlaps a routine step replaces that step for the day. Because a step without an end lasts until the next one, giving short steps an end keeps a nearby event from replacing them.
3. Apply any one-off changes for today only (`routineOverrides/{date}`), such as "no nap today." Each change is matched to the day's steps by start time: it replaces the step(s) starting then, removes them when marked `skip`, or is added if nothing starts then. The template is not changed.

### Calendar

- A week view, color-coded by person.

### Meals

- **Weekly dinner plan:** a recipe per day, or "Eating out."
- **Recipe box:** recipe cards, including a "Cleo's pick" tag.
- **Recipe sheet:** shows the ingredients, with **Add ingredients to grocery list**. Items already on the list are skipped.

### Grocery

- Add items by typing or by voice on the tablet mic.
- Items are grouped by category.
- Each item shows its source: voice, recipe or a person.
- Checked items move to **In the cart**.

### Chores

- A column per person: parents, then Cleo. Each shows the person's name, their stars or stickers, and "x/y today".
- Each chore repeats daily, on weekdays, weekly or once. Whether it shows and whether it's done is worked out from its check-off dates, in local time:
  - **Daily:** every day. Daily chores reset each morning (at midnight).
  - **Weekdays:** Monday to Friday, resetting the same way.
  - **Weekly:** every day of the week, Monday to Sunday, until it's done. Once done it stays ticked for the rest of that week.
  - **Once:** every day until it's done. It shows ticked that day and is gone from the next.
- Unticking removes the check-off that counts, which for a weekly chore may be from an earlier day. Both ticking and unticking go through the activity log. The toast is a short message (about 2 seconds) with no Undo button: a chore stays on the list, so tapping it again is the undo. Each change can still be undone from the phone's **Recent changes**.
- Adults earn stars. Cleo's chores show big pictures and earn stickers. Both are one per check-off this month ("★ 14 this month", "⭐ 28 stickers"), counted from the check-offs, so unticking or undoing keeps them right and the count starts again on the 1st.
- Ticking one of Cleo's chores sets off the sparkle burst, and the last one of her day sets off a bigger one. Neither shows under reduced motion.
- Chores for someone who isn't a member don't show. Setting chores up is phone-only (§5).

### Explore

- **Drive time slider:** 10–60 min.
- **When:** this weekend, the next 2 weeks or this month.
- **Filter chips:** free, indoor or outdoor, and categories.
- **List or map view.**
- Filters here don't change the home screen picks.

### Event detail sheet

Opens when an event title is tapped, on the home screen or in Explore. It shows:

- the date and time,
- the place and drive time,
- a 2–3 sentence summary written by the event job in its own words,
- a credit for the source,
- **View on [source]**, which opens an in-app viewer with a Back button,
- **Add to calendar**.

## 5. Phone (Manage)

Tabs: Recipes · Meal plan · Chores · Settings.

- **Recipes:**
  - Import from a link, then edit.
  - Editing covers name, time, serves, tags, ingredients (add or remove), steps, source link and delete.
- **Meal plan:** tap a day to pick a recipe, mark it "Eating out," or clear it.
- **Chores:**
  - Add or edit a chore's name, person and how often it repeats.
  - Cleo's chores also get a picture.
- **Settings:**
  - Weather: location search by city or ZIP. The list disambiguates places with the same name, for example Rochester, MI vs NY vs MN. There's also an option to use the tablet's location.
  - Temperature in °F or °C, with a live preview.
  - Calendar: pick which Google Calendar to sync, from the calendars the consented account can see. Defaults to the one found automatically (§7).
  - Still to add: event settings, family members and the screen schedule.
- **When out:**
  - The phone can check off chores and grocery items.
  - It can also undo changes from **Recent changes**.

## 6. Toddler-proofing (no PIN)

- **Open on the tablet:** everyday actions, such as checking off, adding items, and adding events to the calendar.
- **Activity log:** every change is saved to Firebase with who or which device made it, what changed and when.
- **Undo on the tablet:** an **Undo** toast stays up for 10 seconds after each change, except chore check-offs, which show a short message instead (§4 Chores). A newer change replaces the toast, and tapping Undo shows "Undone".
- **How undo works:** each log entry keeps the changed doc's value before and after. Undo puts the before value back (removing the doc if the change created it) and marks the entry undone. Undoing the same entry again does nothing.
- **Undo on the phone:** a **Recent changes** list with undo for each entry.
- **Phone only:** deleting, editing recipes, setting up chores and changing settings.

## 7. Calendar ownership

Every event goes on the shared Family calendar. The app decides whose event it is in this order:

1. **Guests.** Google account emails are mapped to Alice, Bob and Cleo. More than one guest means more than one color. The app reads the guest list, so it never needs to sign in as Cleo.
2. **A name at the start of the title.** Names and nicknames like "Cleo –" or "Alice:" count, which works for events added by voice on the Hub. A name in the middle of the title does not count. The name has to be a whole word ("Cleopatra" is not Cleo), case doesn't matter, and several names joined at the start ("Alice & Bob:", "Dad and Cleo –") give several owners.
3. **Otherwise, Family.**

Finding the calendar:

- Nobody copies the calendar ID by hand. If `settings/main.calendar.id` is empty, the sync function lists the calendars the consented account can see and picks the one named "Family" (case-insensitive), then saves its ID and name to `settings/main.calendar`.
- If no calendar or more than one matches, it saves nothing and sets `calendar.status` to `not_found` or `ambiguous`, so the app can say so. Once found, `calendar.status` is `ok`.
- `calendar.status` only ever holds this detection result. Whether syncing works is recorded separately, in `lastSyncAt` and `error` (see Syncing).
- Later, phone Settings gets a calendar picker that lists the same calendars and overwrites the saved choice. The `calendar.readonly` consent already covers listing.

Syncing:

- Every 5 minutes the sync function mirrors the Family calendar into `events`, from 7 days back to 14 days ahead, so today's past events and the start of the week still show. Recurring events are stored per instance; cancelled events, and events no longer in that window, are removed.
- All-day events are stored as local midnights in the calendar's time zone.
- Each run records its health on `settings/main.calendar`, merged so `id`, `name` and `status` are kept:
  - After a full sync it sets `lastSyncAt` (server time) and clears `error`.
  - If anything throws, including a failed token refresh, it sets `error: { message, at }` and leaves `lastSyncAt` at the last good sync. The message is one line of at most 300 characters: the HTTP status and Google's error body (such as `invalid_grant` or `invalid_client`), never tokens or client secrets. The full message also goes to Cloud Logging.
  - When the calendar is `not_found` or `ambiguous`, Google did answer, so `error` is cleared, but `lastSyncAt` is not set because nothing was mirrored.
  - The app shows a notice from these fields (#7).

Additional rules:

- Tapping an event lets you correct the person. The correction is stored in Firebase against the event ID (`eventOverrides`) and wins over the detected owners when the app reads events.
- Optionally, each adult can connect their own calendar. Those events show as theirs, or as "Busy" on the kitchen screen for privacy.
- Personal to-dos: each adult decides whether to add them to the app.

## 8. Event suggestions

A scheduled Cloud Function collects events, cleans them up, ranks them and writes the results to Firestore.

**Sources**

- **Local feeds:** iCal or RSS from the library, parks and rec, downtown Rochester and county parks.
- **LittleGuide Detroit** (required). The site appears to use The Events Calendar WordPress plugin, which usually offers a JSON or iCal feed. Its roundup articles also feed the AI pass.
- **Ticketmaster Discovery API**, for larger ticketed family events.
- **A weekly AI pass:** the Claude API with web search, returning results as JSON. This covers sites with no feed.
- Eventbrite is not used, since it has no public search API.
- More sources will be added at build time.

**Processing**

- Put every event into one format.
- Work out the drive time from home.
- Merge duplicates.
- Write the short summary for each event.

**Ranking**

- **Drive time:**
  - Up to 10 min counts fully.
  - 10–20 min is shown only for high-scoring events.
  - Nothing farther than 20 min appears on the home screen.
- **Age fit for Cleo.**
- **Free time on the Family calendar.**
- **Time of day:** weekend mornings score higher, and clashes with nap or bedtime score lower.
- **Feedback:** Add, Hide and "fewer like this" adjust future picks.
- **Cost and distance** also count.

## 9. Grocery and the Hub

- **For now:** voice input uses the tablet mic. The Hub stays for timers.
- **Why:** items added on the Hub go into Google Keep, which has no public API for personal accounts. Google retired custom Assistant actions in 2023.
- **Later experiment:** an unofficial Keep sync. It's fragile and could break at any time.

## 10. Build phases

1. **Phase 1:** calendar, Today screen, weather, chores, grocery list, Cleo's day.
2. **Phase 2:** meals and recipes with link import, plus the phone Manage screens and Settings.
3. **Phase 3:** event search and Explore.
4. **Later:** Google Photos slideshow as an idle screen, Hub/Keep sync experiment, and an optional calmer night look.

## 11. Open

- Visual tweaks as they come up.
