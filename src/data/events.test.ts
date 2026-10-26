import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { applyOverride, specialFromTitle } from './events';
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

describe('special from the title', () => {
  it('takes a ⭐ anywhere or a leading *, and hides it', () => {
    expect(specialFromTitle('Pumpkin patch ⭐')).toEqual({ title: 'Pumpkin patch', marked: true });
    expect(specialFromTitle('⭐️ Pumpkin patch')).toEqual({ title: 'Pumpkin patch', marked: true });
    expect(specialFromTitle('Cleo ⭐ birthday')).toEqual({ title: 'Cleo birthday', marked: true });
    expect(specialFromTitle('*Pumpkin patch')).toEqual({ title: 'Pumpkin patch', marked: true });
    expect(specialFromTitle(' * Pumpkin patch')).toEqual({ title: 'Pumpkin patch', marked: true });
  });

  it('ignores a * that is not at the start, and plain titles', () => {
    expect(specialFromTitle('Math 5*2 review')).toEqual({
      title: 'Math 5*2 review',
      marked: false,
    });
    expect(specialFromTitle('Swim')).toEqual({ title: 'Swim', marked: false });
  });

  it('keeps a title that is only a marker', () => {
    expect(specialFromTitle('⭐')).toEqual({ title: '⭐', marked: true });
  });

  it('marks the event special and shows it without the marker', () => {
    const view = applyOverride('e1', { ...event, title: '⭐ Cleo – pumpkin patch' });
    expect(view).toMatchObject({ title: 'Cleo – pumpkin patch', special: true });
  });

  it("lets the phone's Special setting win over the title", () => {
    expect(applyOverride('e1', { ...event, title: '*Zoo' }, { special: false }).special).toBe(
      false,
    );
    expect(applyOverride('e1', event, { special: true }).special).toBe(true);
  });
});
