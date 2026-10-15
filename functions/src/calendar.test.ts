import { describe, expect, it } from 'vitest';
import { eventTimes, localMidnight, pickFamilyCalendar } from './calendar.js';

describe('pickFamilyCalendar', () => {
  it('picks the one calendar named Family, ignoring case', () => {
    const pick = pickFamilyCalendar([
      { id: 'me@example.com', summary: 'me@example.com' },
      { id: 'fam123@group.calendar.google.com', summary: 'family' },
    ]);
    expect(pick).toEqual({ status: 'ok', id: 'fam123@group.calendar.google.com', name: 'family' });
  });

  it('uses the account’s own rename of a calendar', () => {
    const pick = pickFamilyCalendar([
      { id: 'x', summary: 'Smith household', summaryOverride: 'Family' },
    ]);
    expect(pick).toEqual({ status: 'ok', id: 'x', name: 'Family' });
  });

  it('says not_found when no calendar is named Family', () => {
    expect(
      pickFamilyCalendar([
        { id: 'a', summary: 'Work' },
        { id: 'b', summary: 'Family trip' },
      ]),
    ).toEqual({
      status: 'not_found',
    });
    expect(pickFamilyCalendar([])).toEqual({ status: 'not_found' });
  });

  it('says ambiguous when more than one matches', () => {
    expect(
      pickFamilyCalendar([
        { id: 'a', summary: 'Family' },
        { id: 'b', summary: 'FAMILY' },
      ]),
    ).toEqual({
      status: 'ambiguous',
    });
  });
});

describe('eventTimes', () => {
  it('keeps timed events as their instants', () => {
    const t = eventTimes(
      {
        id: 'e',
        start: { dateTime: '2026-10-15T09:00:00-04:00' },
        end: { dateTime: '2026-10-15T10:00:00-04:00' },
      },
      'America/Detroit',
    );
    expect(t).toEqual({
      start: new Date('2026-10-15T13:00:00Z'),
      end: new Date('2026-10-15T14:00:00Z'),
      allDay: false,
    });
  });

  it('turns all-day dates into local midnights in the calendar’s zone', () => {
    const t = eventTimes(
      { id: 'e', start: { date: '2026-10-15' }, end: { date: '2026-10-16' } },
      'America/Detroit',
    );
    expect(t).toEqual({
      start: new Date('2026-10-15T04:00:00Z'),
      end: new Date('2026-10-16T04:00:00Z'),
      allDay: true,
    });
  });

  it('returns null for an event with no times', () => {
    expect(eventTimes({ id: 'e' }, 'UTC')).toBeNull();
  });
});

describe('localMidnight', () => {
  it('handles the days around a DST change', () => {
    // US clocks go back on 2026-11-01.
    expect(localMidnight('2026-11-01', 'America/Detroit')).toEqual(
      new Date('2026-11-01T04:00:00Z'),
    );
    expect(localMidnight('2026-11-02', 'America/Detroit')).toEqual(
      new Date('2026-11-02T05:00:00Z'),
    );
    expect(localMidnight('2026-03-29', 'Europe/London')).toEqual(new Date('2026-03-29T00:00:00Z'));
    expect(localMidnight('2026-03-30', 'Europe/London')).toEqual(new Date('2026-03-29T23:00:00Z'));
  });
});
