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
| Screen schedule | Wake at 6:15, dim at 8:45 pm, off at 10 pm. Motion wake through Fully Kiosk's camera. |

## 2. Family

| Person | Color | Notes |
|---|---|---|
| Alice | Blue | Parent |
| Bob | Teal | Parent |
| Cleo | Purple | The kid (a toddler). Has their own Google account. |
| Family | Amber | Shared events |

Alice, Bob and Cleo are placeholder names used in this spec, the mockups and the issues. The app reads real names from Firestore (`members`), so "Cleo's day" and "Cleo's pick" show the kid's actual name.

Header chips toggle each person's events on and off in the Today and Calendar views.

## 3. Look & feel

- **Palette:** purple, with a starry night-sky header.
- **Mascot:** an original unicorn in the header. Tapping it opens Cleo's day.
- **Playful details:** a rainbow "Now" line, and a sparkle burst plus a sticker when one of Cleo's chores is done.
- **Fonts:** Baloo 2 for display text and Atkinson Hyperlegible for body text.
- **Themes:** light and dark. Motion respects reduced-motion settings.
- **Fun level:** the same look all day. A calmer look for nights or mornings can come later.

## 4. Tablet screens

Tabs: Today · Calendar · Meals · Grocery · Chores, plus Cleo's day (opened from the unicorn) and Explore (opened from the Nearby card).

### Today

- **Header:** clock, date, weather (current temperature plus high and low), person chips and the unicorn.
- **Agenda:** today's events with a color bar per person, the "Now" line, and past events dimmed.
- **Dinner tonight:** the planned meal and a suggested start time, with a link to the recipe.
- **Chores today:** the first few chores, with a link to the full list.
- **Grocery:** count, a short preview and a mic button.
- **Nearby this week:** 4–6 ranked suggestions, plus **See more**, which opens Explore.

### Cleo's day

A picture routine with a **Weekday / Weekend** toggle.

- **Current step:** the latest step whose start time has passed. It gets a rainbow border, and earlier steps fade. The highlight only shows on the routine that matches today.
- **Countdown:** "N sleeps until…" the next Cleo or Family event marked as special.

| Time | Weekday | Weekend |
|---|---|---|
| 6:30 | ☀️ Wake up | ☀️ Wake up |
| 7:00 | 🥣 Breakfast | 🥣 Breakfast |
| 7:45 | 🪥 Teeth & get ready | |
| 8:00 | 🎨 Daycare | |
| 11:00 | | 🥪 Lunch |
| 12:15–2:00 | | 😴 Nap |
| 4:00 | 🚗 Pickup | |
| 5:00 | 🌮 Dinner | 🌮 Dinner |
| 7:00 | 🍎 Snack | 🍎 Snack |
| 7:30 | 🛁 Bath | 🛁 Bath |
| 8:20 | 🌙 Bedtime | 🌙 Bedtime |

How the routine is built each day:

1. Start from the routine template for the day type. Templates are stored in Firebase and edited on the phone.
2. Merge in today's calendar events that involve Cleo, placed by time.
   - Each event gets a picture: matched from words in the title, or picked when the event is edited.
   - An event that overlaps a routine step replaces that step for the day.
3. Apply any one-off changes for today only, such as "no nap today." The template is not changed.

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

- A column per person.
- Each chore repeats daily, on weekdays, weekly or once.
- Daily chores reset each morning.
- Adults earn stars. Cleo's chores show big pictures and earn stickers.

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
- **Undo on the tablet:** an **Undo** toast stays up for 10 seconds after each change.
- **Undo on the phone:** a **Recent changes** list with undo for each entry.
- **Phone only:** deleting, editing recipes, setting up chores and changing settings.

## 7. Calendar ownership

Every event goes on the shared Family calendar. The app decides whose event it is in this order:

1. **Guests.** Google account emails are mapped to Alice, Bob and Cleo. More than one guest means more than one color. The app reads the guest list, so it never needs to sign in as Cleo.
2. **A name at the start of the title.** Names and nicknames like "Cleo –" or "Alice:" count, which works for events added by voice on the Hub. A name in the middle of the title does not count.
3. **Otherwise, Family.**

Finding the calendar:

- Nobody copies the calendar ID by hand. If `settings/main.calendar.id` is empty, the sync function lists the calendars the consented account can see and picks the one named "Family" (case-insensitive), then saves its ID and name to `settings/main.calendar`.
- If no calendar or more than one matches, it saves nothing and sets `calendar.status` to `not_found` or `ambiguous`, so the app can say so.
- Later, phone Settings gets a calendar picker that lists the same calendars and overwrites the saved choice. The `calendar.readonly` consent already covers listing.

Additional rules:

- Tapping an event lets you correct the person. The correction is stored in Firebase against the event ID.
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
