import { afterEach, describe, expect, it, vi } from 'vitest';
import { isShown, resetFilters, showsOwners, subscribeFilters, toggleFilter } from './filters';
import { clockParts, longDate, msToNextMinute } from './format';
import {
  FAMILY,
  chipsFor,
  initial,
  kidDayTitle,
  kidOf,
  memberForEmail,
  sortMembers,
  type MemberWithId,
} from './people';
import { parseHash, tabLabel } from './routes';

const m = (id: string, color: MemberWithId['color'], isKid = false): MemberWithId => ({
  id,
  name: id[0].toUpperCase() + id.slice(1),
  color,
  emails: [`${id}@example.com`],
  nicknames: [],
  isKid,
});

describe('clock and date', () => {
  it('formats a 12-hour clock with am/pm', () => {
    expect(clockParts(new Date(2026, 9, 14, 7, 42))).toEqual({ time: '7:42', ampm: 'am' });
    expect(clockParts(new Date(2026, 9, 14, 0, 5))).toEqual({ time: '12:05', ampm: 'am' });
    expect(clockParts(new Date(2026, 9, 14, 12, 0))).toEqual({ time: '12:00', ampm: 'pm' });
    expect(clockParts(new Date(2026, 9, 14, 22, 9))).toEqual({ time: '10:09', ampm: 'pm' });
  });

  it('writes the long date as in the mockup', () => {
    expect(longDate(new Date(2026, 9, 14))).toBe('Wednesday, October 14');
  });

  it('counts down to the next minute', () => {
    expect(msToNextMinute(new Date(2026, 9, 14, 7, 42, 59, 500))).toBe(500);
    expect(msToNextMinute(new Date(2026, 9, 14, 7, 42, 0, 0))).toBe(60_000);
  });
});

describe('people', () => {
  const members = [m('cleo', 'kid', true), m('bob', 'p2'), m('alice', 'p1')];

  it('orders parents, then the kid, then Family', () => {
    expect(chipsFor(members).map((c) => c.id)).toEqual(['alice', 'bob', 'cleo', FAMILY]);
    expect(chipsFor([]).map((c) => c.name)).toEqual(['Family']);
  });

  it('breaks color ties by name', () => {
    expect(sortMembers([m('zed', 'p1'), m('amy', 'p1')]).map((x) => x.id)).toEqual(['amy', 'zed']);
  });

  it('finds the kid and names their day', () => {
    expect(kidOf(members)?.id).toBe('cleo');
    expect(kidDayTitle(kidOf(members))).toBe("Cleo's day");
    expect(kidOf([m('alice', 'p1')])).toBeNull();
  });

  it('matches the signed-in account by email, ignoring case', () => {
    expect(memberForEmail(members, 'Bob@Example.com')?.id).toBe('bob');
    expect(memberForEmail(members, 'tablet@example.com')).toBeNull();
    expect(memberForEmail(members, null)).toBeNull();
  });

  it('uses the first letter as the avatar', () => {
    expect(initial(' alice')).toBe('A');
    expect(initial('')).toBe('?');
  });
});

describe('person filters', () => {
  afterEach(resetFilters);

  it('starts with every chip on', () => {
    expect(isShown('alice')).toBe(true);
    expect(isShown(FAMILY)).toBe(true);
  });

  it('toggles a chip and tells subscribers', () => {
    const l = vi.fn();
    const stop = subscribeFilters(l);
    toggleFilter('alice');
    expect(isShown('alice')).toBe(false);
    toggleFilter('alice');
    expect(isShown('alice')).toBe(true);
    expect(l).toHaveBeenCalledTimes(2);
    stop();
    toggleFilter('alice');
    expect(l).toHaveBeenCalledTimes(2);
  });

  it('shows an event if any owner is on, and owner-less events as Family', () => {
    toggleFilter('alice');
    expect(showsOwners(['alice'])).toBe(false);
    expect(showsOwners(['alice', 'bob'])).toBe(true);
    expect(showsOwners([])).toBe(true);
    toggleFilter(FAMILY);
    expect(showsOwners([])).toBe(false);
  });
});

describe('routes', () => {
  it('parses known hashes and falls back to Today', () => {
    expect(parseHash('#cal')).toBe('cal');
    expect(parseHash('#/chores')).toBe('chores');
    expect(parseHash('#kid')).toBe('kid');
    expect(parseHash('')).toBe('today');
    expect(parseHash('#nope')).toBe('today');
  });

  it('labels tabs, but not the kid view', () => {
    expect(tabLabel('cal')).toBe('Calendar');
    expect(tabLabel('kid')).toBeUndefined();
  });
});
