import type { CalendarSettings, EventView } from '../data/types';
import { addDays, eventsOn, shortTime, startOfDay } from '../today/agenda';

// The Calendar tab (spec §4 Calendar, design/tablet-mockup.html #v-cal): this
// week, Monday to Sunday, one row per day. Plus the event sheet's date line and
// the notice shown when the calendar can't be used (spec §7). Local time.

/** Monday of the week containing `d`, at midnight. */
export function weekStart(d: Date) {
  const day = startOfDay(d);
  return addDays(day, -((day.getDay() + 6) % 7));
}

export interface WeekDay {
  day: Date;
  today: boolean;
  /** Every event that overlaps the day, all-day first, then by start. */
  events: EventView[];
}

/** Monday to Sunday of this week, each with its events. */
export function weekDays(events: EventView[], now: Date): WeekDay[] {
  const monday = weekStart(now);
  const today = startOfDay(now).getTime();
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    return { day, today: day.getTime() === today, events: eventsOn(events, day) };
  });
}

/** "9:00 am", "12:30 pm". */
export function clockTime(d: Date) {
  return `${shortTime(d)} ${d.getHours() >= 12 ? 'pm' : 'am'}`;
}

/** "Wed, Oct 14". */
export function shortDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/**
 * The event sheet's date and time, in the mockup's "Wed, Oct 14 · 10am" style:
 * "Wed, Oct 14 · 10:00 – 11:00 am", "Sat, Oct 17 · All day",
 * "Fri, Oct 16 – Sun, Oct 18 · All day", "Fri, Oct 16, 8:00 pm – Sat, Oct 17, 2:00 am".
 */
export function eventWhen(e: EventView) {
  const start = e.start.toDate();
  const end = e.end.toDate();
  if (e.allDay) {
    // All-day events end at the next local midnight, so the last day is the one before.
    const last = addDays(end, -1);
    const days = last > start ? `${shortDate(start)} – ${shortDate(last)}` : shortDate(start);
    return `${days} · All day`;
  }
  // Ending at midnight still counts as the same day.
  if (!sameDay(start, new Date(Math.max(start.getTime(), end.getTime() - 1)))) {
    return `${shortDate(start)}, ${clockTime(start)} – ${shortDate(end)}, ${clockTime(end)}`;
  }
  const sameHalf = start.getHours() >= 12 === end.getHours() >= 12;
  const from = sameHalf ? shortTime(start) : clockTime(start);
  return start.getTime() === end.getTime()
    ? `${shortDate(start)} · ${clockTime(start)}`
    : `${shortDate(start)} · ${from} – ${clockTime(end)}`;
}

/** After this long without a full sync, the calendar counts as failing. */
export const STALE_MS = 30 * 60 * 1000;

export interface CalendarNotice {
  text: string;
  /** A second, quieter line: what it means or how to fix it. */
  hint: string;
  /** No events can come through: show the notice instead of the list. */
  blocking: boolean;
}

/** "3:40 pm" today, "Tue 3:40 pm" this past week, otherwise "Oct 3". */
export function sinceLabel(d: Date, now: Date) {
  if (sameDay(d, now)) return clockTime(d);
  if (d >= addDays(startOfDay(now), -6)) {
    return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${clockTime(d)}`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * What to say when the calendar isn't usable (spec §7), from settings/main.calendar,
 * or null when all is well. Before the first sync there's nothing to say yet.
 */
export function calendarNotice(
  cal: CalendarSettings | undefined,
  now: Date,
): CalendarNotice | null {
  if (!cal) return null;
  if (cal.status === 'not_found') {
    return {
      text: 'Family calendar not found',
      hint: 'Name a Google Calendar “Family” and its events will show here.',
      blocking: true,
    };
  }
  if (cal.status === 'ambiguous') {
    return {
      text: 'More than one Family calendar',
      hint: 'Keep just one Google Calendar named “Family”.',
      blocking: true,
    };
  }
  const last = cal.lastSyncAt?.toDate();
  const stale = last && now.getTime() - last.getTime() > STALE_MS;
  if (!cal.error && !stale) return null;
  // Failing since the last good sync, or since the first failure we know of.
  const since = last ?? cal.error?.at.toDate();
  return {
    text: since ? `Calendar sync failing since ${sinceLabel(since, now)}` : 'Calendar sync failing',
    hint: 'Events here may be out of date.',
    blocking: false,
  };
}
