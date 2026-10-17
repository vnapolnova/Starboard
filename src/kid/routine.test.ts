import { afterEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { EventView, RoutineStep } from '../data/types';
import {
  applyChanges,
  buildDay,
  clockLabel,
  countdown,
  currentStep,
  dayKind,
  eventPic,
  stepName,
  templateSteps,
  type DayStep,
} from './routine';

// Local times in October 2026: Wed the 14th is a weekday, Sat the 17th a weekend.
const at = (h: number, m = 0, day = 14) => new Date(2026, 9, day, h, m);

const WEEKDAY: RoutineStep[] = [
  { name: 'Wake up', pic: '☀️', start: '06:30' },
  { name: 'Breakfast', pic: '🥣', start: '07:00' },
  { name: 'Teeth & get ready', pic: '🪥', start: '07:45' },
  { name: 'Daycare', pic: '🎨', start: '08:00' },
  { name: 'Pickup', pic: '🚗', start: '16:00' },
  { name: 'Dinner', pic: '🌮', start: '17:00' },
  { name: 'Snack', pic: '🍎', start: '19:00' },
  { name: 'Bath', pic: '🛁', start: '19:30' },
  { name: 'Bedtime', pic: '🌙', start: '20:20' },
];

const WEEKEND: RoutineStep[] = [
  { name: 'Wake up', pic: '☀️', start: '06:30' },
  { name: 'Breakfast', pic: '🥣', start: '07:00' },
  { name: 'Lunch', pic: '🥪', start: '11:00' },
  { name: 'Nap', pic: '😴', start: '12:15', end: '14:00' },
  { name: 'Dinner', pic: '🌮', start: '17:00' },
  { name: 'Snack', pic: '🍎', start: '19:00' },
  { name: 'Bath', pic: '🛁', start: '19:30' },
  { name: 'Bedtime', pic: '🌙', start: '20:20' },
];

const KID = { id: 'cleo', name: 'Cleo', nicknames: ['Clee'] };

function ev(title: string, start: Date, end: Date, extra: Partial<EventView> = {}): EventView {
  return {
    id: title,
    title,
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
    allDay: false,
    ownerIds: ['cleo'],
    ownerSource: 'title',
    special: false,
    ...extra,
  };
}

const names = (steps: DayStep[]) => steps.map((s) => s.name);
const current = (steps: DayStep[], now: Date) => steps[currentStep(steps, now)]?.name ?? null;

describe('dayKind', () => {
  it('is weekend on Saturday and Sunday only', () => {
    expect(dayKind(at(9, 0, 16))).toBe('weekday'); // Fri
    expect(dayKind(at(9, 0, 17))).toBe('weekend'); // Sat
    expect(dayKind(at(9, 0, 18))).toBe('weekend'); // Sun
    expect(dayKind(at(9, 0, 19))).toBe('weekday'); // Mon
  });
});

describe('templateSteps', () => {
  it('labels steps like the mockup, with a range for a step that has an end', () => {
    const steps = templateSteps(WEEKEND);
    expect(steps[0].label).toBe('6:30');
    expect(steps.find((s) => s.name === 'Nap')?.label).toBe('12:15–2:00');
    expect(steps.at(-1)?.label).toBe('8:20');
  });

  it('sorts by start whatever order the doc has', () => {
    expect(names(templateSteps([...WEEKDAY].reverse()))).toEqual(names(templateSteps(WEEKDAY)));
  });

  it('formats midnight and noon', () => {
    expect(clockLabel(0)).toBe('12:00');
    expect(clockLabel(12 * 60 + 5)).toBe('12:05');
  });
});

describe('buildDay: merging events', () => {
  it('is the template when there are no events or changes', () => {
    expect(names(buildDay(WEEKDAY, [], null, KID, at(9)))).toEqual(WEEKDAY.map((s) => s.name));
  });

  it("places Cleo's event by time and replaces the step it overlaps", () => {
    // Swim 5:15–5:45 overlaps Dinner (5:00 until Snack at 7:00).
    const day = buildDay(
      WEEKDAY,
      [ev('Cleo – swim lesson', at(17, 15), at(17, 45))],
      null,
      KID,
      at(9),
    );
    expect(names(day)).toEqual([
      'Wake up',
      'Breakfast',
      'Teeth & get ready',
      'Daycare',
      'Pickup',
      'Swim lesson',
      'Snack',
      'Bath',
      'Bedtime',
    ]);
    const swim = day.find((s) => s.from === 'event');
    expect(swim).toMatchObject({ pic: '🏊', label: '5:15–5:45', start: 17 * 60 + 15 });
  });

  it('replaces every step an event overlaps', () => {
    // 7:30–8:30 covers Breakfast (7:00–7:45), Teeth (7:45–8:00) and Daycare (8:00–4:00).
    const day = buildDay(WEEKDAY, [ev('Checkup', at(7, 30), at(8, 30))], null, KID, at(9));
    expect(names(day)).toEqual([
      'Wake up',
      'Checkup',
      'Pickup',
      'Dinner',
      'Snack',
      'Bath',
      'Bedtime',
    ]);
  });

  it("doesn't replace a step that ends just as the event starts", () => {
    // The nap ends at 2:00; an event at 2:00 replaces nothing before it.
    const day = buildDay(
      WEEKEND,
      [ev('Playdate', at(14, 0, 17), at(15, 30, 17))],
      null,
      KID,
      at(9, 0, 17),
    );
    expect(names(day)).toContain('Nap');
    expect(names(day)).toContain('Lunch');
    expect(names(day).indexOf('Playdate')).toBe(names(day).indexOf('Nap') + 1);
  });

  it('a step with no end lasts until the next one, and bedtime until midnight', () => {
    const late = buildDay(WEEKDAY, [ev('Fireworks', at(21), at(22))], null, KID, at(9));
    expect(names(late)).not.toContain('Bedtime');
    expect(names(late).at(-1)).toBe('Fireworks');
  });

  it("ignores other people's events, all-day events and other days", () => {
    const day = buildDay(
      WEEKDAY,
      [
        ev('Alice: gym', at(17), at(18), { ownerIds: ['alice'] }),
        ev('Family dinner', at(17), at(18), { ownerIds: [] }),
        ev('Pajama day', at(0), at(0, 0, 15), { allDay: true }),
        ev('Swim', at(17, 0, 15), at(18, 0, 15)),
      ],
      null,
      KID,
      at(9),
    );
    expect(names(day)).toEqual(WEEKDAY.map((s) => s.name));
  });

  it('places nothing without a kid', () => {
    const day = buildDay(WEEKDAY, [ev('Swim', at(17), at(18))], null, null, at(9));
    expect(names(day)).toEqual(WEEKDAY.map((s) => s.name));
  });
});

describe('buildDay: one-off changes', () => {
  it('"no nap today" removes the nap without touching the template', () => {
    const template = structuredClone(WEEKEND);
    const day = buildDay(
      template,
      [],
      { steps: [{ name: 'Nap', pic: '😴', start: '12:15', skip: true }] },
      KID,
      at(9, 0, 17),
    );
    expect(names(day)).not.toContain('Nap');
    expect(names(day)).toHaveLength(WEEKEND.length - 1);
    expect(template).toEqual(WEEKEND);
  });

  it('replaces the step at the same start, and adds one at a new start', () => {
    const day = applyChanges(templateSteps(WEEKDAY), {
      steps: [
        { name: 'Pajama party', pic: '🥳', start: '19:30' },
        { name: 'Grandma visits', pic: '👵', start: '18:00', end: '18:45' },
      ],
    });
    expect(names(day).slice(-5)).toEqual([
      'Dinner',
      'Grandma visits',
      'Snack',
      'Pajama party',
      'Bedtime',
    ]);
    expect(day.find((s) => s.name === 'Grandma visits')).toMatchObject({
      from: 'override',
      label: '6:00–6:45',
    });
  });

  it('applies after events, so a change can skip an event step', () => {
    const day = buildDay(
      WEEKDAY,
      [ev('Swim', at(17, 15), at(17, 45))],
      { steps: [{ name: 'Swim', pic: '🏊', start: '17:15', skip: true }] },
      KID,
      at(9),
    );
    expect(names(day)).not.toContain('Swim');
    expect(names(day)).not.toContain('Dinner'); // still replaced for the day
  });
});

describe('currentStep', () => {
  const weekday = templateSteps(WEEKDAY);

  it('is the step starting exactly now', () => {
    expect(current(weekday, at(8, 0))).toBe('Daycare');
  });

  it('is the previous step a minute before', () => {
    expect(current(weekday, at(7, 59))).toBe('Teeth & get ready');
  });

  it('is none before the first step', () => {
    expect(currentStep(weekday, at(6, 29))).toBe(-1);
    expect(currentStep(weekday, at(0, 0))).toBe(-1);
  });

  it('stays on bedtime after bedtime', () => {
    expect(current(weekday, at(20, 20))).toBe('Bedtime');
    expect(current(weekday, at(23, 59))).toBe('Bedtime');
  });

  it('is none for an empty routine', () => {
    expect(currentStep([], at(9))).toBe(-1);
  });
});

describe('the day on a faked clock', () => {
  afterEach(() => vi.useRealTimers());

  function today() {
    const now = new Date();
    const kind = dayKind(now);
    const steps = buildDay(kind === 'weekday' ? WEEKDAY : WEEKEND, [], null, KID, now);
    return { kind, step: current(steps, now) };
  }

  it('Wednesday at 10:00 is a weekday at daycare', () => {
    vi.useFakeTimers({ now: at(10, 0, 14) });
    expect(today()).toEqual({ kind: 'weekday', step: 'Daycare' });
  });

  it('Saturday at 1:00 pm is a weekend nap', () => {
    vi.useFakeTimers({ now: at(13, 0, 17) });
    expect(today()).toEqual({ kind: 'weekend', step: 'Nap' });
  });

  it('Sunday at 4:30 pm is still the nap step until dinner', () => {
    vi.useFakeTimers({ now: at(16, 30, 18) });
    expect(today()).toEqual({ kind: 'weekend', step: 'Nap' });
  });
});

describe('stepName and eventPic', () => {
  it('drops a leading name or nickname, and capitalizes what is left', () => {
    expect(stepName('Cleo – swim lesson', ['Cleo'])).toBe('Swim lesson');
    expect(stepName('cleo: zoo', ['Cleo'])).toBe('Zoo');
    expect(stepName('Clee - library', ['Cleo', 'Clee'])).toBe('Library');
  });

  it('keeps titles with other names, the name in the middle, or nothing after it', () => {
    expect(stepName('Alice & Cleo: zoo', ['Cleo'])).toBe('Alice & Cleo: zoo');
    expect(stepName('Swim with Cleo', ['Cleo'])).toBe('Swim with Cleo');
    expect(stepName('Cleopatra: exhibit', ['Cleo'])).toBe('Cleopatra: exhibit');
    expect(stepName('Cleo –', ['Cleo'])).toBe('Cleo –');
  });

  it("matches a picture from the title, and the event's own pic wins", () => {
    expect(eventPic({ title: 'Swim lesson' })).toBe('🏊');
    expect(eventPic({ title: 'Pumpkin patch' })).toBe('🎃');
    expect(eventPic({ title: 'Something new' })).toBe('📅');
    expect(eventPic({ title: 'Swim lesson', pic: '🐬' })).toBe('🐬');
  });
});

describe('countdown', () => {
  const now = at(9, 0, 14);

  it('counts sleeps to the next special Cleo or Family event on a later day', () => {
    const c = countdown(
      [
        ev('Not special', at(10, 0, 15), at(11, 0, 15)),
        ev('Pumpkin patch', at(10, 0, 17), at(12, 0, 17), { ownerIds: [], special: true }),
        ev('Cleo – birthday', at(15, 0, 20), at(17, 0, 20), { special: true }),
      ],
      KID,
      now,
    );
    expect(c).toEqual({ sleeps: 3, title: 'Pumpkin patch', pic: '🎃' });
  });

  it("skips today's and other people's special events", () => {
    const c = countdown(
      [
        ev('Today special', at(18), at(19), { special: true }),
        ev('Alice: concert', at(19, 0, 15), at(21, 0, 15), { ownerIds: ['alice'], special: true }),
        ev('Cleo – birthday', at(15, 0, 20), at(17, 0, 20), { special: true }),
      ],
      KID,
      now,
    );
    expect(c).toEqual({ sleeps: 6, title: 'Birthday', pic: '🎂' });
  });

  it('is one sleep at 11:59 pm before a special event at midnight', () => {
    const c = countdown(
      [ev('Trip', at(0, 0, 15), at(0, 0, 16), { allDay: true, special: true })],
      KID,
      at(23, 59),
    );
    expect(c?.sleeps).toBe(1);
  });

  it('is null when nothing special is coming, and has no pic when nothing matches', () => {
    expect(countdown([], KID, now)).toBeNull();
    const c = countdown([ev('Big day', at(10, 0, 16), at(11, 0, 16), { special: true })], KID, now);
    expect(c).toEqual({ sleeps: 2, title: 'Big day', pic: undefined });
  });
});
