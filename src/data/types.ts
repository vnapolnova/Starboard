import type { Timestamp } from 'firebase/firestore';

// Firestore data model (docs/phase-1-plan.md §2). Everything lives under
// households/{hid}; family details come from Firestore, never from code.

/** Person color tokens in src/styles/tokens.css. */
export type PersonColor = 'p1' | 'p2' | 'kid' | 'fam';

/** "HH:MM", 24-hour, in the household's local time. */
export type ClockTime = string;

/** "YYYY-MM-DD" in the household's local time. */
export type DateKey = string;

/** households/{hid}. Written only by the seed script (Admin SDK). */
export interface Household {
  name: string;
  /** Lowercase Google account emails that may sign in: parents and the tablet. */
  allowedEmails: string[];
}

/** households/{hid}/members/{memberId} */
export interface Member {
  name: string;
  color: PersonColor;
  /** Google account emails, matched against calendar guests (spec §7). */
  emails: string[];
  /** Matched at the start of event titles, as well as the name (spec §7). */
  nicknames: string[];
  isKid: boolean;
}

/** households/{hid}/settings/main */
export interface Settings {
  weather: { place: string; lat: number; lon: number; unit: 'F' | 'C' };
  screen: { wake: ClockTime; dim: ClockTime; off: ClockTime };
  /** Written by the calendar sync (spec §7). id and name are empty until it's found. */
  calendar?: { id?: string; name?: string; status: 'ok' | 'not_found' | 'ambiguous' };
}

/** How an event's owners were worked out (spec §7). */
export type OwnerSource = 'guests' | 'title' | 'family';

/** households/{hid}/events/{eventId}. Mirrored from Google Calendar by a Cloud Function. */
export interface CalendarEvent {
  title: string;
  start: Timestamp;
  end: Timestamp;
  /** All-day events have no time; start and end are local midnights. */
  allDay: boolean;
  /** Member IDs. Empty means Family. */
  ownerIds: string[];
  ownerSource: OwnerSource;
}

/** An event as the app shows it: the mirrored event with its override applied. */
export interface EventView extends Omit<CalendarEvent, 'ownerSource'> {
  id: string;
  /** 'override' when a correction made in the app set the owners. */
  ownerSource: OwnerSource | 'override';
  special: boolean;
  pic?: string;
}

/** households/{hid}/eventOverrides/{eventId}. Corrections made in the app, applied on read. */
export interface EventOverride {
  ownerIds?: string[];
  special?: boolean;
  pic?: string;
}

export type Repeat = 'daily' | 'weekdays' | 'weekly' | 'once';

/** households/{hid}/chores/{choreId} */
export interface Chore {
  name: string;
  memberId: string;
  repeat: Repeat;
  /** Picture for the kid's chores: an emoji or an image URL. */
  pic?: string;
}

/** households/{hid}/choreCompletions/{date}_{choreId} */
export interface ChoreCompletion {
  date: DateKey;
  choreId: string;
  doneAt: Timestamp;
  /** Member ID, or the device that checked it off. */
  doneBy: string;
}

export type GrocerySource = 'voice' | 'typed' | 'recipe';

/** households/{hid}/grocery/{itemId} */
export interface GroceryItem {
  name: string;
  category: string;
  source: GrocerySource;
  /** Member ID of whoever added it, shown as the source tag. */
  addedBy?: string;
  /** Checked off: shown under "In the cart". */
  done: boolean;
  addedAt: Timestamp;
}

export interface RoutineStep {
  name: string;
  pic: string;
  start: ClockTime;
  /** Optional, for a step with a set length such as the nap ("12:15–2:00"). */
  end?: ClockTime;
}

export type RoutineKind = 'weekday' | 'weekend';

/** households/{hid}/routines/{weekday|weekend} */
export interface Routine {
  steps: RoutineStep[];
}

/**
 * A one-off change, matched to the day's steps by start time: it replaces the
 * step(s) starting then, or removes them with `skip` ("no nap today"), or is
 * added if nothing starts then.
 */
export interface RoutineChange extends RoutineStep {
  skip?: boolean;
}

/** households/{hid}/routineOverrides/{date}. One-off changes for that day only. */
export interface RoutineOverride {
  steps: RoutineChange[];
}

/** households/{hid}/stickers/{memberId} */
export interface StickerCounts {
  /** Keyed by "YYYY-MM". */
  counts: Record<string, number>;
}

/** households/{hid}/activity/{logId}. Every app write is logged here for undo (spec §6). */
export interface ActivityEntry {
  ts: Timestamp;
  actor: { email: string; device: 'tablet' | 'phone' };
  /** Short verb such as "chore.done" or "grocery.add". */
  action: string;
  /** Path of the changed doc, relative to the household, e.g. "grocery/abc". */
  path: string;
  /** null when the doc didn't exist before (a create) or after (a delete). */
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  undone: boolean;
}

/** Collection name → document type, for the typed helpers in src/data/db.ts. */
export interface Collections {
  members: Member;
  settings: Settings;
  events: CalendarEvent;
  eventOverrides: EventOverride;
  chores: Chore;
  choreCompletions: ChoreCompletion;
  grocery: GroceryItem;
  routines: Routine;
  routineOverrides: RoutineOverride;
  stickers: StickerCounts;
  activity: ActivityEntry;
}
