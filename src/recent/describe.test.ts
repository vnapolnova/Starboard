import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import type { ActivityEntry } from '../data/types';
import type { MemberWithId } from '../shell/people';
import { describeWhat, describeWhen, describeWho } from './describe';

const entry = (over: Partial<ActivityEntry>): ActivityEntry => ({
  ts: Timestamp.now(),
  actor: { email: 'kitchen@example.com', device: 'tablet' },
  action: 'grocery.add',
  path: 'grocery/a',
  before: null,
  after: { name: 'Milk', done: false },
  undone: false,
  ...over,
});

const bob: MemberWithId = {
  id: 'bob',
  name: 'Bob',
  color: 'p2',
  emails: ['bob@example.com'],
  nicknames: [],
  isKid: false,
};

const chores = new Map([['water', 'Water plants']]);

describe('describeWhat', () => {
  it('names grocery changes', () => {
    expect(describeWhat(entry({}), chores)).toBe('Added Milk');
    expect(describeWhat(entry({ action: 'grocery.done' }), chores)).toBe('Milk is in the cart');
    expect(describeWhat(entry({ action: 'grocery.undone' }), chores)).toBe(
      'Milk is back on the list',
    );
  });

  it('uses the before value for a delete', () => {
    const cleared = entry({ action: 'grocery.clear', before: { name: 'Eggs' }, after: null });
    expect(describeWhat(cleared, chores)).toBe('Cleared Eggs from the cart');
  });

  it('looks chores up by ID', () => {
    const done = { choreId: 'water', date: '2026-10-26' };
    expect(describeWhat(entry({ action: 'chore.done', before: null, after: done }), chores)).toBe(
      'Checked off Water plants',
    );
    expect(describeWhat(entry({ action: 'chore.undone', before: done, after: null }), chores)).toBe(
      'Unchecked Water plants',
    );
  });

  it('falls back for a deleted chore or an unknown action', () => {
    const gone = entry({ action: 'chore.done', after: { choreId: 'gone' } });
    expect(describeWhat(gone, chores)).toBe('Checked off a chore');
    expect(describeWhat(entry({ action: 'thing.moved', after: {} }), chores)).toBe(
      'Changed an item',
    );
  });
});

describe('describeWho', () => {
  it('names the member on that account, ignoring case', () => {
    const e = entry({ actor: { email: 'Bob@example.com', device: 'phone' } });
    expect(describeWho(e, [bob])).toBe('Bob');
  });

  it('calls the tablet account the kitchen screen', () => {
    expect(describeWho(entry({}), [bob])).toBe('Kitchen screen');
  });

  it('shows the email for an unknown phone account', () => {
    const e = entry({ actor: { email: 'guest@example.com', device: 'phone' } });
    expect(describeWho(e, [bob])).toBe('guest@example.com');
  });
});

describe('describeWhen', () => {
  const now = new Date(2026, 9, 26, 15, 0);

  it('shows only the time today', () => {
    expect(describeWhen(new Date(2026, 9, 26, 10, 42), now)).toBe('10:42 am');
  });

  it('says Yesterday, across a month boundary too', () => {
    expect(describeWhen(new Date(2026, 9, 25, 18, 5), now)).toBe('Yesterday 6:05 pm');
    expect(describeWhen(new Date(2026, 8, 30, 0, 5), new Date(2026, 9, 1, 9, 0))).toBe(
      'Yesterday 12:05 am',
    );
  });

  it('shows the date for older changes', () => {
    expect(describeWhen(new Date(2026, 9, 12, 18, 5), now)).toBe('Mon, Oct 12 · 6:05 pm');
  });
});
