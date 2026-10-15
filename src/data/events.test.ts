import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { applyOverride } from './events';
import type { CalendarEvent } from './types';

const event: CalendarEvent = {
  title: 'Cleo – swim',
  start: Timestamp.fromMillis(0),
  end: Timestamp.fromMillis(3_600_000),
  allDay: false,
  ownerIds: ['cleo'],
  ownerSource: 'title',
};

describe('applyOverride', () => {
  it('passes the event through when there is no override', () => {
    expect(applyOverride('e1', event)).toEqual({ id: 'e1', ...event, special: false });
  });

  it('lets the override’s owners win over the detected ones', () => {
    const view = applyOverride('e1', event, { ownerIds: ['alice', 'cleo'] });
    expect(view.ownerIds).toEqual(['alice', 'cleo']);
    expect(view.ownerSource).toBe('override');
  });

  it('can correct an event to Family with an empty list', () => {
    const view = applyOverride('e1', event, { ownerIds: [] });
    expect(view).toMatchObject({ ownerIds: [], ownerSource: 'override' });
  });

  it('keeps detected owners when the override only sets special or pic', () => {
    const view = applyOverride('e1', event, { special: true, pic: '🏊' });
    expect(view).toMatchObject({
      ownerIds: ['cleo'],
      ownerSource: 'title',
      special: true,
      pic: '🏊',
    });
  });
});
