import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { CalendarSettings, EventView } from '../data/types';
import { calendarNotice, eventWhen, sinceLabel, weekDays, weekStart } from './week';

// Local-time dates, like the app. Wed Oct 14 2026.
const at = (d: number, h = 0, m = 0) => new Date(2026, 9, d, h, m);
const ts = (d: Date) => Timestamp.fromDate(d);

function ev(id: string, start: Date, end: Date, allDay = false): EventView {
  return {
    id,
    title: id,
    start: ts(start),
    end: ts(end),
    allDay,
    ownerIds: [],
    ownerSource: 'family',
    special: false,
  };
}

describe('weekStart', () => {
  it('is the Monday of the week', () => {
    expect(weekStart(at(14, 15))).toEqual(at(12));
    expect(weekStart(at(12))).toEqual(at(12));
  });

  it('puts Sunday at the end of the week, not the start', () => {
    expect(weekStart(at(18, 23, 59))).toEqual(at(12));
    expect(weekStart(at(19))).toEqual(at(19));
  });
});

describe('weekDays', () => {
  const now = at(14, 9);

  it('lists Monday to Sunday and marks today', () => {
    const days = weekDays([], now);
    expect(days.map((d) => d.day.getDate())).toEqual([12, 13, 14, 15, 16, 17, 18]);
    expect(days.filter((d) => d.today).map((d) => d.day.getDate())).toEqual([14]);
  });

  it('places events on their days and leaves out other weeks', () => {
    const days = weekDays(
      [
        ev('gym', at(15, 7), at(15, 8)),
        ev('last week', at(11, 10), at(11, 11)),
        ev('next week', at(19, 10), at(19, 11)),
      ],
      now,
    );
    expect(days.flatMap((d) => d.events.map((e) => e.id))).toEqual(['gym']);
    expect(days[3].events.map((e) => e.id)).toEqual(['gym']);
  });

  it('shows a multi-day event on each day it covers, all-day events first', () => {
    const days = weekDays(
      [
        ev('dinner', at(16, 18), at(16, 19)),
        ev('trip', at(16), at(18), true),
        ev('late', at(16, 23), at(17, 1)),
      ],
      now,
    );
    expect(days[4].events.map((e) => e.id)).toEqual(['trip', 'dinner', 'late']);
    expect(days[5].events.map((e) => e.id)).toEqual(['trip', 'late']);
    expect(days[6].events.map((e) => e.id)).toEqual([]);
  });
});

describe('eventWhen', () => {
  it('gives a timed event its day and times', () => {
    expect(eventWhen(ev('a', at(14, 10), at(14, 11)))).toBe('Wed, Oct 14 · 10:00 – 11:00 am');
    expect(eventWhen(ev('a', at(14, 11, 30), at(14, 13)))).toBe('Wed, Oct 14 · 11:30 am – 1:00 pm');
    expect(eventWhen(ev('a', at(14, 21), at(15)))).toBe('Wed, Oct 14 · 9:00 pm – 12:00 am');
  });

  it('shows a single time when start and end are the same', () => {
    expect(eventWhen(ev('a', at(14, 8), at(14, 8)))).toBe('Wed, Oct 14 · 8:00 am');
  });

  it('names both days when a timed event runs overnight', () => {
    expect(eventWhen(ev('a', at(16, 20), at(17, 2)))).toBe(
      'Fri, Oct 16, 8:00 pm – Sat, Oct 17, 2:00 am',
    );
  });

  it('labels all-day events, with a range when they span days', () => {
    expect(eventWhen(ev('a', at(17), at(18), true))).toBe('Sat, Oct 17 · All day');
    expect(eventWhen(ev('a', at(16), at(19), true))).toBe('Fri, Oct 16 – Sun, Oct 18 · All day');
  });
});

describe('calendarNotice', () => {
  const now = at(14, 15, 40);
  const cal = (c: Partial<CalendarSettings>): CalendarSettings => ({ status: 'ok', ...c });

  it('says nothing before the first sync or while syncing is healthy', () => {
    expect(calendarNotice(undefined, now)).toBeNull();
    expect(calendarNotice(cal({}), now)).toBeNull();
    expect(calendarNotice(cal({ lastSyncAt: ts(at(14, 15, 35)) }), now)).toBeNull();
  });

  it('blocks the list when the Family calendar is missing or ambiguous', () => {
    expect(calendarNotice(cal({ status: 'not_found' }), now)).toEqual({
      text: 'Family calendar not found',
      hint: 'Name a Google Calendar “Family” and its events will show here.',
      blocking: true,
    });
    expect(calendarNotice(cal({ status: 'ambiguous' }), now)).toEqual({
      text: 'More than one Family calendar',
      hint: 'Keep just one Google Calendar named “Family”.',
      blocking: true,
    });
  });

  it('reports an error since the last good sync', () => {
    const notice = calendarNotice(
      cal({
        lastSyncAt: ts(at(14, 15, 35)),
        error: { message: '400 invalid_grant', at: ts(at(14, 15, 39)) },
      }),
      now,
    );
    expect(notice).toEqual({
      text: 'Calendar sync failing since 3:35 pm',
      hint: 'Events here may be out of date.',
      blocking: false,
    });
  });

  it('uses the error time when there has never been a good sync', () => {
    const notice = calendarNotice(cal({ error: { message: 'x', at: ts(at(14, 9, 5)) } }), now);
    expect(notice?.text).toBe('Calendar sync failing since 9:05 am');
  });

  it('counts a sync older than 30 minutes as failing, even with no error', () => {
    expect(calendarNotice(cal({ lastSyncAt: ts(at(14, 15, 10)) }), now)).toBeNull();
    expect(calendarNotice(cal({ lastSyncAt: ts(at(14, 15, 9)) }), now)?.text).toBe(
      'Calendar sync failing since 3:09 pm',
    );
  });
});

describe('sinceLabel', () => {
  const now = at(14, 15);
  it('is a time today, a weekday and time this past week, else a date', () => {
    expect(sinceLabel(at(14, 7, 5), now)).toBe('7:05 am');
    expect(sinceLabel(at(13, 22), now)).toBe('Tue 10:00 pm');
    expect(sinceLabel(at(8, 9), now)).toBe('Thu 9:00 am');
    expect(sinceLabel(at(7, 23), now)).toBe('Oct 7');
  });
});
