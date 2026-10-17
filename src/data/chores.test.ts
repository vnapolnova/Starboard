import { describe, expect, it } from 'vitest';
import { choresPreview, dateKey, dueOn, type ChoreWithId } from './chores';

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

const wed = new Date(2026, 9, 14, 9);
const sat = new Date(2026, 9, 17, 9);

describe('dateKey', () => {
  it('uses the local date, zero-padded', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 9, 14, 0, 0))).toBe('2026-10-14');
  });
});

describe('dueOn', () => {
  it('shows weekday chores Monday to Friday only', () => {
    expect(dueOn(chore('a', 'x', 'weekdays'), wed)).toBe(true);
    expect(dueOn(chore('a', 'x', 'weekdays'), sat)).toBe(false);
    expect(dueOn(chore('a', 'x', 'weekdays'), new Date(2026, 9, 18))).toBe(false);
  });

  it('shows daily chores every day', () => {
    expect(dueOn(chore('a', 'x'), sat)).toBe(true);
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
    const ids = choresPreview(chores, new Set(['dishes']), wed, order).map((c) => c.id);
    expect(ids).toEqual(['plants', 'daycare bag', 'trash', 'toys']);
  });

  it('leaves out chores not due today', () => {
    const ids = choresPreview(chores, new Set(), sat, order, 10).map((c) => c.id);
    expect(ids).not.toContain('daycare bag');
  });

  it('puts chores for unknown people last', () => {
    const ids = choresPreview([chore('x', 'gone'), chore('y', 'cleo')], new Set(), wed, order).map(
      (c) => c.id,
    );
    expect(ids).toEqual(['y', 'x']);
  });
});
