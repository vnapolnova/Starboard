import { Timestamp, type Firestore } from 'firebase-admin/firestore';
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

export async function syncHousehold(
  db: Firestore,
  hid: string,
  api: CalendarApi,
  now = new Date(),
): Promise<SyncResult> {
  const home = db.collection('households').doc(hid);
  const settingsRef = home.collection('settings').doc('main');

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
