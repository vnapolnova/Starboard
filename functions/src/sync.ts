import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';
import {
  eventTimes,
  pickFamilyCalendar,
  type CalendarListEntry,
  type GoogleEvent,
} from './calendar.js';
import { detectOwners, type OwnerMember } from './owners.js';

// Mirrors the Family calendar into households/{hid}/events (plan §3). The
// Google side is behind CalendarApi so tests can run it on fixtures.

export interface CalendarApi {
  listCalendars(): Promise<CalendarListEntry[]>;
  /** Single instances (recurring events expanded) starting in [timeMin, timeMax). */
  listEvents(
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<{ timeZone: string; items: GoogleEvent[] }>;
}

const DAY = 24 * 60 * 60 * 1000;
/** Kept a week back so today's past events and the start of the week still show. */
export const SYNC_DAYS_BACK = 7;
export const SYNC_DAYS_AHEAD = 14;

export type SyncResult =
  | { status: 'ok'; calendarId: string; written: number; removed: number }
  | { status: 'not_found' | 'ambiguous' };

/** Longest error message saved to settings, so the app shows a line, not a dump. */
export const ERROR_MAX = 300;

/** Short, one-line message for `calendar.error`. Errors from google.ts carry only
 *  the HTTP status and Google's error body (e.g. invalid_grant), never credentials. */
export function syncErrorMessage(err: unknown): string {
  const text = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').trim();
  return text.length > ERROR_MAX ? `${text.slice(0, ERROR_MAX - 1)}…` : text || 'Unknown error';
}

/**
 * Syncs one household and records its health on settings/main.calendar
 * (spec §7): `lastSyncAt` after a full sync, `error: {message, at}` after any
 * throw, which is then rethrown. `id`, `name` and `status` are kept.
 */
export async function syncHousehold(
  db: Firestore,
  hid: string,
  api: CalendarApi,
  now = new Date(),
): Promise<SyncResult> {
  const settingsRef = db.collection('households').doc(hid).collection('settings').doc('main');
  let result: SyncResult;
  try {
    result = await mirror(db, hid, settingsRef, api, now);
  } catch (err) {
    try {
      await settingsRef.set(
        {
          calendar: {
            error: { message: syncErrorMessage(err), at: FieldValue.serverTimestamp() },
          },
        },
        { merge: true },
      );
    } catch {
      // Firestore itself is failing; the caller still gets (and logs) the original error.
    }
    throw err;
  }
  // Google answered, so any old error is stale. Only a full sync counts as synced.
  await settingsRef.set(
    {
      calendar: {
        error: FieldValue.delete(),
        ...(result.status === 'ok' ? { lastSyncAt: FieldValue.serverTimestamp() } : {}),
      },
    },
    { merge: true },
  );
  return result;
}

async function mirror(
  db: Firestore,
  hid: string,
  settingsRef: DocumentReference,
  api: CalendarApi,
  now: Date,
): Promise<SyncResult> {
  const home = db.collection('households').doc(hid);

  let calendarId: string | undefined = (await settingsRef.get()).get('calendar.id') || undefined;
  if (!calendarId) {
    const pick = pickFamilyCalendar(await api.listCalendars());
    if (pick.status !== 'ok') {
      // Saves nothing but the status, so the app can say what's wrong (spec §7).
      await settingsRef.set({ calendar: { status: pick.status } }, { merge: true });
      return { status: pick.status };
    }
    await settingsRef.set(
      { calendar: { id: pick.id, name: pick.name, status: 'ok' } },
      { merge: true },
    );
    calendarId = pick.id;
  }

  const members: OwnerMember[] = (await home.collection('members').get()).docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<OwnerMember, 'id'>),
  }));

  const timeMin = new Date(now.getTime() - SYNC_DAYS_BACK * DAY);
  const timeMax = new Date(now.getTime() + SYNC_DAYS_AHEAD * DAY);
  const { timeZone, items } = await api.listEvents(calendarId, timeMin, timeMax);

  const events = home.collection('events');
  const writer = db.bulkWriter();
  const seen = new Set<string>();

  for (const e of items) {
    if (e.status === 'cancelled') continue;
    const times = eventTimes(e, timeZone);
    if (!times) continue;
    const owners = detectOwners(
      { title: e.summary, guestEmails: (e.attendees ?? []).flatMap((a) => a.email ?? []) },
      members,
    );
    seen.add(e.id);
    void writer.set(events.doc(e.id), {
      title: e.summary ?? '',
      // Free text from Google; shown on the event sheet. Empty when there's none.
      location: e.location?.trim() ?? '',
      start: Timestamp.fromDate(times.start),
      end: Timestamp.fromDate(times.end),
      allDay: times.allDay,
      ...owners,
    });
  }

  // Anything mirrored before but no longer on the calendar (or out of the window).
  let removed = 0;
  for (const ref of await events.listDocuments()) {
    if (seen.has(ref.id)) continue;
    void writer.delete(ref);
    removed++;
  }
  await writer.close();

  return { status: 'ok', calendarId, written: seen.size, removed };
}
