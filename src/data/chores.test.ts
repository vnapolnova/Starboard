import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import {
  choreOn,
  choresFor,
  choresOn,
  choresPreview,
  completionsFrom,
  dateKey,
  finishesList,
  monthCount,
  weekStartKey,
  type ChoreWithId,
} from './chores';
import type { ChoreCompletion } from './types';

const chore = (
  id: string,
  memberId: string,
  repeat: ChoreWithId['repeat'] = 'daily',
): ChoreWithId => ({
  id,
  name: id,
  memberId,
  repeat,
});

const done = (choreId: string, date: string): ChoreCompletion => ({
  choreId,
  date,
  doneAt: Timestamp.fromMillis(0),
  doneBy: 'tablet',
});

// October 2026: Monday the 12th to Sunday the 18th.
const mon = new Date(2026, 9, 12, 9);
const tue = new Date(2026, 9, 13, 9);
const wed = new Date(2026, 9, 14, 9);
const sat = new Date(2026, 9, 17, 9);
const sun = new Date(2026, 9, 18, 9);
const nextMon = new Date(2026, 9, 19, 9);

describe('dateKey', () => {
  it('uses the local date, zero-padded', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 9, 14, 0, 0))).toBe('2026-10-14');
  });
});

describe('weekStartKey and completionsFrom', () => {
  it('starts weeks on Monday', () => {
    expect(weekStartKey(mon)).toBe('2026-10-12');
    expect(weekStartKey(wed)).toBe('2026-10-12');
    expect(weekStartKey(sun)).toBe('2026-10-12');
    expect(weekStartKey(nextMon)).toBe('2026-10-19');
  });

  it('crosses month and year ends', () => {
    expect(weekStartKey(new Date(2026, 0, 1))).toBe('2025-12-29');
  });

  it('reaches back to whichever is earlier, the Monday or the 1st', () => {
    expect(completionsFrom(wed)).toBe('2026-10-01');
    expect(completionsFrom(new Date(2026, 10, 1))).toBe('2026-10-26');
  });
});

describe('choreOn', () => {
  describe('daily', () => {
    const c = chore('dishes', 'a');

    it('shows every day, done only by a check-off today', () => {
      expect(choreOn(c, [], sat)).toEqual({ due: true, done: null });
      expect(choreOn(c, [done('dishes', '2026-10-17')], sat).done).toMatchObject({
        date: '2026-10-17',
      });
      expect(choreOn(c, [done('dishes', '2026-10-16')], sat).done).toBeNull();
    });

    it('resets at midnight', () => {
      const ticked = [done('dishes', '2026-10-14')];
      expect(choreOn(c, ticked, new Date(2026, 9, 14, 23, 59, 59)).done).not.toBeNull();
      expect(choreOn(c, ticked, new Date(2026, 9, 15, 0, 0, 0)).done).toBeNull();
    });

    it("ignores another chore's check-off", () => {
      expect(choreOn(c, [done('trash', '2026-10-14')], wed).done).toBeNull();
    });
  });

  describe('weekdays', () => {
    const c = chore('bag', 'a', 'weekdays');

    it('shows Monday to Friday only', () => {
      expect(choreOn(c, [], mon).due).toBe(true);
      expect(choreOn(c, [], new Date(2026, 9, 16, 9)).due).toBe(true);
      expect(choreOn(c, [], sat).due).toBe(false);
      expect(choreOn(c, [], sun).due).toBe(false);
    });

    it('resets at midnight like daily', () => {
      const ticked = [done('bag', '2026-10-13')];
      expect(choreOn(c, ticked, new Date(2026, 9, 13, 23, 59)).done).not.toBeNull();
      expect(choreOn(c, ticked, new Date(2026, 9, 14, 0, 0)).done).toBeNull();
    });

    it('turns off at midnight into Saturday', () => {
      expect(choreOn(c, [], new Date(2026, 9, 16, 23, 59)).due).toBe(true);
      expect(choreOn(c, [], new Date(2026, 9, 17, 0, 0)).due).toBe(false);
    });
  });

  describe('weekly', () => {
    const c = chore('sheets', 'a', 'weekly');

    it('shows every day until done', () => {
      for (const d of [mon, wed, sun]) expect(choreOn(c, [], d)).toEqual({ due: true, done: null });
    });

    it('stays ticked for the rest of the week once done', () => {
      const ticked = [done('sheets', '2026-10-13')];
      expect(choreOn(c, ticked, mon).done).toBeNull();
      expect(choreOn(c, ticked, tue).done).toMatchObject({ date: '2026-10-13' });
      expect(choreOn(c, ticked, sun).done).toMatchObject({ date: '2026-10-13' });
    });

    it('is fresh again at midnight into Monday', () => {
      const ticked = [done('sheets', '2026-10-13')];
      expect(choreOn(c, ticked, new Date(2026, 9, 18, 23, 59)).done).not.toBeNull();
      expect(choreOn(c, ticked, new Date(2026, 9, 19, 0, 0)).done).toBeNull();
    });

    it("doesn't count last week's check-off", () => {
      expect(choreOn(c, [done('sheets', '2026-10-11')], mon).done).toBeNull();
    });

    it('picks the latest check-off when there are two', () => {
      const ticked = [done('sheets', '2026-10-12'), done('sheets', '2026-10-14')];
      expect(choreOn(c, ticked, sat).done).toMatchObject({ date: '2026-10-14' });
    });
  });

  describe('once', () => {
    const c = chore('daycare form', 'a', 'once');

    it('shows every day until done', () => {
      expect(choreOn(c, [], wed)).toEqual({ due: true, done: null });
      expect(choreOn(c, [], nextMon)).toEqual({ due: true, done: null });
    });

    it('shows ticked on the day it is done, and is gone from the next day', () => {
      const ticked = [done('daycare form', '2026-10-14')];
      expect(choreOn(c, ticked, new Date(2026, 9, 14, 23, 59))).toMatchObject({
        due: true,
        done: { date: '2026-10-14' },
      });
      expect(choreOn(c, ticked, new Date(2026, 9, 15, 0, 0)).due).toBe(false);
      expect(choreOn(c, [done('daycare form', '2025-01-02')], wed).due).toBe(false);
    });
  });

  it('ignores check-offs dated after the day', () => {
    expect(choreOn(chore('x', 'a', 'once'), [done('x', '2026-10-15')], wed)).toEqual({
      due: true,
      done: null,
    });
    expect(choreOn(chore('x', 'a', 'weekly'), [done('x', '2026-10-15')], wed).done).toBeNull();
  });
});

describe('choresOn', () => {
  it('keeps only the chores that show today, with their check-offs', () => {
    const list = choresOn(
      [chore('dishes', 'a'), chore('bag', 'a', 'weekdays'), chore('form', 'a', 'once')],
      [done('dishes', '2026-10-17'), done('form', '2026-10-16')],
      sat,
    );
    expect(list.map((d) => [d.chore.id, d.done?.date ?? null])).toEqual([['dishes', '2026-10-17']]);
  });
});

describe('choresPreview', () => {
  const order = ['alice', 'bob', 'cleo'];
  const chores = [
    chore('toys', 'cleo'),
    chore('trash', 'bob'),
    chore('dishes', 'alice'),
    chore('plants', 'alice'),
    chore('daycare bag', 'bob', 'weekdays'),
  ];

  it('lists not-done first, then by person, then by name, up to four', () => {
    const list = choresOn(chores, [done('dishes', '2026-10-14')], wed);
    expect(choresPreview(list, order).map((d) => d.chore.id)).toEqual([
      'plants',
      'daycare bag',
      'trash',
      'toys',
    ]);
  });

  it('puts chores for unknown people last', () => {
    const list = choresOn([chore('x', 'gone'), chore('y', 'cleo')], [], wed);
    expect(choresPreview(list, order).map((d) => d.chore.id)).toEqual(['y', 'x']);
  });
});

describe('choresFor', () => {
  it("lists one person's chores by name, ticked or not", () => {
    const list = choresOn(
      [chore('toys', 'cleo'), chore('brush teeth', 'cleo'), chore('trash', 'bob')],
      [done('brush teeth', '2026-10-14')],
      wed,
    );
    expect(choresFor(list, 'cleo').map((d) => d.chore.id)).toEqual(['brush teeth', 'toys']);
  });
});

describe('monthCount', () => {
  const chores = [
    chore('dishes', 'alice'),
    chore('sheets', 'alice', 'weekly'),
    chore('toys', 'cleo'),
  ];

  it("counts this month's check-offs of the person's chores", () => {
    const completions = [
      done('dishes', '2026-10-01'),
      done('dishes', '2026-10-14'),
      done('sheets', '2026-10-13'),
      done('toys', '2026-10-14'),
      done('dishes', '2026-09-30'),
    ];
    expect(monthCount(chores, completions, 'alice', wed)).toBe(3);
    expect(monthCount(chores, completions, 'cleo', wed)).toBe(1);
    expect(monthCount(chores, completions, 'bob', wed)).toBe(0);
  });

  it('counts a check-off once even if it arrives twice', () => {
    const twice = [done('toys', '2026-10-14'), done('toys', '2026-10-14')];
    expect(monthCount(chores, twice, 'cleo', wed)).toBe(1);
  });

  it('starts again on the 1st', () => {
    expect(monthCount(chores, [done('dishes', '2026-10-31')], 'alice', new Date(2026, 10, 1))).toBe(
      0,
    );
  });
});

describe('finishesList', () => {
  const list = choresOn(
    [chore('toys', 'cleo'), chore('teeth', 'cleo')],
    [done('teeth', '2026-10-14')],
    wed,
  );

  it('is true when the tick is the last one left', () => {
    expect(finishesList(list, 'toys')).toBe(true);
  });

  it('is false while others are still to do', () => {
    expect(
      finishesList(choresOn([chore('toys', 'cleo'), chore('teeth', 'cleo')], [], wed), 'toys'),
    ).toBe(false);
    expect(finishesList([], 'toys')).toBe(false);
  });
});
