import type { EventView } from '../data/types';
import { FAMILY, type MemberWithId } from '../shell/people';

// Today's agenda (spec §4 Today, design/tablet-mockup.html #agenda): today's
// events in start order, past ones dimmed, and the rainbow "Now" line before
// the first event that hasn't started yet. Uses the device's local time zone.

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Events that overlap the local day containing `day`. All-day events first, then by start. */
export function eventsOn(events: EventView[], day: Date) {
  const from = startOfDay(day).getTime();
  const to = addDays(day, 1).getTime();
  return events
    .filter((e) => e.start.toMillis() < to && e.end.toMillis() > from)
    .sort(
      (a, b) =>
        Number(b.allDay) - Number(a.allDay) ||
        a.start.toMillis() - b.start.toMillis() ||
        a.title.localeCompare(b.title),
    );
}

/** "8:00", "12:30": the mockup's agenda times, with no am/pm. */
export function shortTime(d: Date) {
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** The time column: "All day" for all-day events and timed ones covering the whole day. */
export function timeLabel(e: EventView, day: Date) {
  if (e.allDay) return 'All day';
  const start = e.start.toDate();
  if (start >= startOfDay(day)) return shortTime(start);
  // Started on an earlier day.
  const end = e.end.toDate();
  return end < addDays(day, 1) ? `Until ${shortTime(end)}` : 'All day';
}

export interface Owner {
  id: string;
  name: string;
  /** Person color token, e.g. "p1". */
  color: string;
}

const FAMILY_OWNER: Owner = { id: FAMILY, name: 'Family', color: 'fam' };

/** The event's owners as people. No owners, or only unknown IDs, means Family. */
export function ownersOf(e: EventView, members: MemberWithId[]): Owner[] {
  const found = e.ownerIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is MemberWithId => !!m)
    .map(({ id, name, color }) => ({ id, name, color }));
  return found.length ? found : [FAMILY_OWNER];
}

/** "Alice", "Alice & Bob", "Alice, Bob & Cleo". */
export function joinNames(names: string[]) {
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/** The color bar: one color, or equal stripes top to bottom when an event has several owners. */
export function barBackground(owners: Owner[]) {
  if (owners.length === 1) return `var(--${owners[0].color})`;
  const step = 100 / owners.length;
  const stops = owners.map(
    (o, i) => `var(--${o.color}) ${(i * step).toFixed(2)}% ${((i + 1) * step).toFixed(2)}%`,
  );
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

export type AgendaRow = { kind: 'event'; event: EventView; past: boolean } | { kind: 'now' };

/**
 * Today's rows with the Now line placed before the first timed event that
 * hasn't started. All-day events stay above it and are never past today.
 * If everything has started, the Now line goes last.
 */
export function agendaRows(today: EventView[], now: Date): AgendaRow[] {
  const t = now.getTime();
  const rows: AgendaRow[] = [];
  let placed = false;
  for (const event of today) {
    if (!placed && !event.allDay && event.start.toMillis() > t) {
      rows.push({ kind: 'now' });
      placed = true;
    }
    rows.push({ kind: 'event', event, past: !event.allDay && event.end.toMillis() <= t });
  }
  if (!placed) rows.push({ kind: 'now' });
  return rows;
}

/**
 * The line under the agenda once nothing is left to come, as in the mockup:
 * "That's everything today. Tomorrow starts with Gym at 7:00."
 * Returns null while events are still to come.
 */
export function agendaEnd(today: EventView[], tomorrow: EventView[], now: Date) {
  const t = now.getTime();
  if (today.some((e) => !e.allDay && e.start.toMillis() > t)) return null;
  const first = today.length ? "That's everything today." : 'Nothing on the calendar today.';
  const next = tomorrow.find((e) => !e.allDay && e.start.toMillis() >= addDays(now, 1).getTime());
  return next
    ? `${first} Tomorrow starts with ${next.title} at ${shortTime(next.start.toDate())}.`
    : first;
}
