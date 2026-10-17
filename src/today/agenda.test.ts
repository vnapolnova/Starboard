import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { EventView } from '../data/types';
import type { MemberWithId } from '../shell/people';
import {
  agendaEnd,
  agendaRows,
  barBackground,
  eventsOn,
  joinNames,
  ownersOf,
  timeLabel,
} from './agenda';

// Local times on Wed Oct 14, 2026, matching the mockup's day.
const at = (h: number, m = 0, day = 14) => new Date(2026, 9, day, h, m);

function ev(id: string, start: Date, end: Date, extra: Partial<EventView> = {}): EventView {
  return {
    id,
    title: id,
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
    allDay: false,
    ownerIds: [],
    ownerSource: 'family',
    special: false,
    ...extra,
  };
}

const members: MemberWithId[] = [
  { id: 'alice', name: 'Alice', color: 'p1', emails: [], nicknames: [], isKid: false },
  { id: 'bob', name: 'Bob', color: 'p2', emails: [], nicknames: [], isKid: false },
  { id: 'cleo', name: 'Cleo', color: 'kid', emails: [], nicknames: [], isKid: true },
];

const dropoff = ev('Daycare drop-off', at(8), at(8, 30), { ownerIds: ['cleo'] });
const lunch = ev('Lunch', at(12, 30), at(13, 30), { ownerIds: ['bob'] });
const dinner = ev('Family dinner', at(17), at(18));
const allDay = ev('Pumpkin week', at(0), at(0, 0, 15), { allDay: true });

describe('eventsOn', () => {
  it('keeps events overlapping the local day, all-day first, then by start', () => {
    const yesterday = ev('Yesterday', at(9, 0, 13), at(10, 0, 13));
    const tomorrow = ev('Tomorrow', at(9, 0, 15), at(10, 0, 15));
    const overnight = ev('Overnight', at(22, 0, 13), at(2));
    expect(
      eventsOn([dinner, tomorrow, lunch, allDay, yesterday, overnight], at(7)).map((e) => e.id),
    ).toEqual(['Pumpkin week', 'Overnight', 'Lunch', 'Family dinner']);
  });

  it('leaves out an event that ends exactly at midnight from the next day', () => {
    expect(eventsOn([dinner, allDay], at(9, 0, 15))).toEqual([]);
  });
});

describe('timeLabel', () => {
  it('shows the start time without am/pm, as in the mockup', () => {
    expect(timeLabel(dropoff, at(7))).toBe('8:00');
    expect(timeLabel(lunch, at(7))).toBe('12:30');
  });

  it('labels all-day events and events carried over from yesterday', () => {
    expect(timeLabel(allDay, at(7))).toBe('All day');
    expect(timeLabel(ev('x', at(22, 0, 13), at(2)), at(7))).toBe('Until 2:00');
    expect(timeLabel(ev('x', at(9, 0, 13), at(9, 0, 16)), at(7))).toBe('All day');
  });
});

describe('ownersOf', () => {
  it('maps owner IDs to members, in the event’s order', () => {
    const e = ev('x', at(9), at(10), { ownerIds: ['bob', 'alice'] });
    expect(ownersOf(e, members).map((o) => o.name)).toEqual(['Bob', 'Alice']);
  });

  it('falls back to Family for no owners or unknown IDs', () => {
    expect(ownersOf(dinner, members)).toEqual([{ id: 'family', name: 'Family', color: 'fam' }]);
    expect(ownersOf(ev('x', at(9), at(10), { ownerIds: ['gone'] }), members)[0].name).toBe(
      'Family',
    );
  });
});

describe('joinNames and barBackground', () => {
  it('joins names the way people say them', () => {
    expect(joinNames(['Alice'])).toBe('Alice');
    expect(joinNames(['Alice', 'Bob'])).toBe('Alice & Bob');
    expect(joinNames(['Alice', 'Bob', 'Cleo'])).toBe('Alice, Bob & Cleo');
  });

  it('uses the person color, or stripes for several owners', () => {
    expect(barBackground([{ id: 'a', name: 'A', color: 'p1' }])).toBe('var(--p1)');
    expect(
      barBackground([
        { id: 'a', name: 'A', color: 'p1' },
        { id: 'c', name: 'C', color: 'kid' },
      ]),
    ).toBe('linear-gradient(180deg, var(--p1) 0.00% 50.00%, var(--kid) 50.00% 100.00%)');
  });
});

describe('agendaRows', () => {
  const today = [allDay, dropoff, lunch, dinner];
  const shape = (now: Date) =>
    agendaRows(today, now).map((r) =>
      r.kind === 'now' ? 'NOW' : r.past ? `(${r.event.id})` : r.event.id,
    );

  it('puts Now before the first event that has not started, and dims ended ones', () => {
    expect(shape(at(10))).toEqual([
      'Pumpkin week',
      '(Daycare drop-off)',
      'NOW',
      'Lunch',
      'Family dinner',
    ]);
  });

  it('does not dim an event that is still going', () => {
    expect(shape(at(13))).toEqual([
      'Pumpkin week',
      '(Daycare drop-off)',
      'Lunch',
      'NOW',
      'Family dinner',
    ]);
  });

  it('dims an event the minute it ends', () => {
    expect(shape(at(13, 30))).toContain('(Lunch)');
    expect(shape(at(13, 29))).toContain('Lunch');
  });

  it('keeps all-day events above Now and never dims them', () => {
    expect(shape(at(6))).toEqual([
      'Pumpkin week',
      'NOW',
      'Daycare drop-off',
      'Lunch',
      'Family dinner',
    ]);
  });

  it('puts Now last once everything has started', () => {
    expect(shape(at(21))).toEqual([
      'Pumpkin week',
      '(Daycare drop-off)',
      '(Lunch)',
      '(Family dinner)',
      'NOW',
    ]);
  });

  it('shows just the Now line on an empty day', () => {
    expect(agendaRows([], at(9))).toEqual([{ kind: 'now' }]);
  });
});

describe('agendaEnd', () => {
  const gym = ev('Gym', at(7, 0, 15), at(8, 0, 15));
  const tomorrowAllDay = ev('Holiday', at(0, 0, 15), at(0, 0, 16), { allDay: true });

  it('says nothing while events are still to come', () => {
    expect(agendaEnd([dropoff, dinner], [gym], at(9))).toBeNull();
  });

  it('names tomorrow’s first timed event, as in the mockup', () => {
    expect(agendaEnd([dropoff, dinner], [tomorrowAllDay, gym], at(21))).toBe(
      "That's everything today. Tomorrow starts with Gym at 7:00.",
    );
  });

  it('skips events carried over into tomorrow', () => {
    const overnight = ev('Overnight', at(23), at(1, 0, 15));
    expect(agendaEnd([dinner], [overnight], at(21))).toBe("That's everything today.");
  });

  it('says so when the day has nothing on it', () => {
    expect(agendaEnd([], [], at(9))).toBe('Nothing on the calendar today.');
    expect(agendaEnd([allDay], [], at(9))).toBe("That's everything today.");
  });
});
