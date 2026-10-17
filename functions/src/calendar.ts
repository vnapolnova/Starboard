// Finding the Family calendar (spec §7) and turning Google events into
// events/{eventId} docs.

export const FAMILY_CALENDAR_NAME = 'Family';

export interface CalendarListEntry {
  id: string;
  summary?: string;
  /** The account's own rename of the calendar, if any. */
  summaryOverride?: string;
}

export type CalendarPick =
  { status: 'ok'; id: string; name: string } | { status: 'not_found' | 'ambiguous' };

/** The one calendar named "Family" (case-insensitive), or why there isn't one. */
export function pickFamilyCalendar(calendars: CalendarListEntry[]): CalendarPick {
  const want = FAMILY_CALENDAR_NAME.toLowerCase();
  const matches = calendars.filter((c) =>
    [c.summaryOverride, c.summary].some((s) => s?.trim().toLowerCase() === want),
  );
  if (matches.length === 0) return { status: 'not_found' };
  if (matches.length > 1) return { status: 'ambiguous' };
  const [c] = matches;
  return { status: 'ok', id: c.id, name: (c.summaryOverride ?? c.summary ?? '').trim() };
}

/** The parts of a Calendar API event the sync uses. */
export interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: { email?: string }[];
}

/**
 * The UTC instant of local midnight on `date` ("YYYY-MM-DD") in `timeZone`.
 * All-day events are stored this way (src/data/types.ts).
 */
export function localMidnight(date: string, timeZone: string) {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  // Two passes settle the offset even when midnight is near a DST change.
  let utc = guess - offsetMs(guess, timeZone);
  utc = guess - offsetMs(utc, timeZone);
  return new Date(utc);
}

/** How far `timeZone` is ahead of UTC at `instant`, in ms. */
function offsetMs(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

export interface EventTimes {
  start: Date;
  end: Date;
  allDay: boolean;
}

/** Start and end of a Google event, or null if it has neither form. */
export function eventTimes(e: GoogleEvent, timeZone: string): EventTimes | null {
  if (e.start?.dateTime && e.end?.dateTime) {
    return { start: new Date(e.start.dateTime), end: new Date(e.end.dateTime), allDay: false };
  }
  if (e.start?.date && e.end?.date) {
    return {
      start: localMidnight(e.start.date, timeZone),
      end: localMidnight(e.end.date, timeZone),
      allDay: true,
    };
  }
  return null;
}
